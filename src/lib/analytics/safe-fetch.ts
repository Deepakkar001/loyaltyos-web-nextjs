/**
 * Analytics views treat API failures like empty data (no raw backend errors in the UI).
 */
export async function fetchAnalyticsOrEmpty<T>(loader: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] request failed", err);
    }
    return empty;
  }
}
