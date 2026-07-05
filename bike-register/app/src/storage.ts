import AsyncStorage from "@react-native-async-storage/async-storage";

const BIKES_KEY = "bike-register:bikes";

export interface SavedBike {
  id: string;
  /** Proves ownership to the API. Never sent anywhere except this bike's own Authorization header. */
  ownerSecret: string;
}

export async function getSavedBikes(): Promise<SavedBike[]> {
  const raw = await AsyncStorage.getItem(BIKES_KEY);
  return raw ? (JSON.parse(raw) as SavedBike[]) : [];
}

export async function getOwnerSecret(bikeId: string): Promise<string | null> {
  const bikes = await getSavedBikes();
  return bikes.find((b) => b.id === bikeId)?.ownerSecret ?? null;
}

export async function addSavedBike(bike: SavedBike): Promise<void> {
  const bikes = await getSavedBikes();
  if (!bikes.some((b) => b.id === bike.id)) {
    await AsyncStorage.setItem(BIKES_KEY, JSON.stringify([bike, ...bikes]));
  }
}

export async function removeSavedBike(id: string): Promise<void> {
  const bikes = await getSavedBikes();
  await AsyncStorage.setItem(BIKES_KEY, JSON.stringify(bikes.filter((b) => b.id !== id)));
}
