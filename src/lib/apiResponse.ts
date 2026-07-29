/** Parse an API response without exposing native JSON parser errors to users. */
export async function readApiResponse<T = Record<string, unknown>>(
  response: Response,
): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "The server returned an empty response"
        : `The request failed with status ${response.status}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `The server returned an invalid response (${response.status})`,
    );
  }
}
