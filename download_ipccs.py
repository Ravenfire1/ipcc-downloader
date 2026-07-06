#!/usr/bin/env python3
import re
import os
import time
from pathlib import Path
import urllib.request
import urllib.error
import zipfile
import argparse
from multiprocessing.pool import ThreadPool
from tqdm import tqdm

INDEX_URL = "https://itunes.com/version"

RESULT_SUCCESS = 0
RESULT_FILE_EXISTS = 1
RESULT_ERROR = 2

# thread worker function
def download_file(url: str, output_dir: str, retries: int = 3, timeout: int = 30):
    # use file name and parent directory as file name
    filename = "_".join(url.split("/")[-2:])
    dest = Path(f"{output_dir}/{filename}")
    if dest.exists():
        return RESULT_FILE_EXISTS

    last_error = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=timeout) as response:
                with open(dest, "wb") as f:
                    f.write(response.read())
            return RESULT_SUCCESS
        except Exception as e:
            last_error = e
            if attempt < retries:
                time.sleep(2 ** attempt)

    print(f"Error downloading {url} after {retries + 1} attempts: {last_error}")
    dest.unlink(missing_ok=True)
    return RESULT_ERROR

def unzip_file(ipcc_path):
    ipcc_dir = Path(f"{ipcc_path}-dir")
    if ipcc_dir.exists():
        # already unzipped, skipping
        return RESULT_FILE_EXISTS

    try:
        with zipfile.ZipFile(ipcc_path) as zip:
            resolved_dir = ipcc_dir.resolve()
            for member in zip.namelist():
                member_path = (ipcc_dir / member).resolve()
                if resolved_dir != member_path and resolved_dir not in member_path.parents:
                    print(f"Error unzipping {ipcc_path}: unsafe path in archive: {member}")
                    return RESULT_ERROR
            zip.extractall(ipcc_dir)
        return RESULT_SUCCESS
    except zipfile.BadZipFile:
        print(f"Error unzipping {ipcc_path}: File is not a zip file")
        return RESULT_ERROR
    except Exception as e:
        print(f"Error unzipping {ipcc_path}: {e}")
        return RESULT_ERROR

def main(args):
    urls = []
    try:
        if args.input_file != None:
            print(f"Reading file: {args.input_file}")
            fh = open(args.input_file, "r")
        else:
            print(f"Reading Carrier Bundle index from: {INDEX_URL}")
            fh = urllib.request.urlopen(INDEX_URL, timeout=args.timeout)
    except (OSError, urllib.error.URLError) as e:
        print(f"Error reading index: {e}")
        return

    with fh:
        # extract URLs from the XML
        for line in fh.readlines():
            if type(line) != str:
                line = line.decode('utf-8')

            results = re.findall("(http[s]?://.*\.ipcc)", line)
            for result in results:
                urls.append(result)

    # de-duplicate entries
    urls = set(urls)
    urls = sorted(urls)
    print(f"Found {len(urls)} URLs")

    try:
        os.mkdir(args.output_dir)
    except FileExistsError:
        pass

    # store URLs
    output_path = f"{args.output_dir}/ipcc_urls.txt"
    print(f"Writing URLs to file: {output_path}")
    with open(output_path, "w") as output_file:
        for url in urls:
            print(url, file=output_file)

    if args.download_all == False:
        print(f"Finished. To download IPCC files, re-run with arguments: '-i {args.output_dir}/ipcc_urls.txt -d'")
        return

    print(f"Starting download of {len(urls)} files.")

    failed_urls = []
    download_counts = {RESULT_SUCCESS: 0, RESULT_FILE_EXISTS: 0, RESULT_ERROR: 0}
    with tqdm(total=len(urls), desc="Downloading Files") as pbar:
        pool = ThreadPool(args.threads)
        results = pool.imap(
            lambda url: (url, download_file(url, args.output_dir, args.retries, args.timeout)),
            urls,
        )
        for url, result in results:
            download_counts[result] += 1
            if result == RESULT_ERROR:
                failed_urls.append(url)
            pbar.update()

    print(
        f"Downloads finished: {download_counts[RESULT_SUCCESS]} succeeded, "
        f"{download_counts[RESULT_FILE_EXISTS]} already existed, "
        f"{download_counts[RESULT_ERROR]} failed."
    )

    if failed_urls:
        failed_path = f"{args.output_dir}/failed_downloads.txt"
        with open(failed_path, "w") as f:
            for url in failed_urls:
                print(url, file=f)
        print(f"Wrote {len(failed_urls)} failed URLs to {failed_path} (re-run with '-i {failed_path} -d' to retry)")

    p = Path(args.output_dir)
    ipcc_files = list(p.glob('**/*ipcc'))

    unzip_counts = {RESULT_SUCCESS: 0, RESULT_FILE_EXISTS: 0, RESULT_ERROR: 0}
    with tqdm(total=len(ipcc_files), desc="Unzipping Files") as pbar:
        pool = ThreadPool(args.threads)
        results = pool.imap(unzip_file, ipcc_files)
        for result in results:
            unzip_counts[result] += 1
            pbar.update()

    print(
        f"Unzipping finished: {unzip_counts[RESULT_SUCCESS]} succeeded, "
        f"{unzip_counts[RESULT_FILE_EXISTS]} already unzipped, "
        f"{unzip_counts[RESULT_ERROR]} failed."
    )

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('-i', '--input-file', default=None, type=str, help=f"Index file. If unspecified, downloads index from {INDEX_URL}")
    parser.add_argument('-o', '--output-dir', default="data", type=str, help="Output directory")
    parser.add_argument('-d', '--download-all', default=False, action="store_true", help="Download all IPCC files (may take some time)")
    parser.add_argument('-t', '--threads', default=6, type=int, help="Number of parallel download/unzip threads (default: 6)")
    parser.add_argument('-r', '--retries', default=3, type=int, help="Number of retries per failed download (default: 3)")
    parser.add_argument('--timeout', default=30, type=int, help="Network timeout in seconds (default: 30)")
    args = parser.parse_args()

    main(args)
