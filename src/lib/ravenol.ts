export async function fetchRavenolData(query: string): Promise<string | null> {
  try {
    // 1. Search for the query (VIN or car details)
    const searchRes = await fetch(`https://podbor.ravenol.ru/search/?q=${encodeURIComponent(query)}`);
    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();

    // 2. Extract the car page URL
    const match = searchHtml.match(/<a href="(\/1-cars\/[^"]+)" class="ravwidg-list-link">/);
    if (!match) return null;
    
    const carUrl = `https://podbor.ravenol.ru${match[1]}`;

    // 3. Fetch the car page
    const carRes = await fetch(carUrl);
    if (!carRes.ok) return null;
    const carHtml = await carRes.text();

    // 4. Strip HTML tags to reduce token usage
    const parser = new DOMParser();
    const doc = parser.parseFromString(carHtml, 'text/html');
    
    // Extract text from the main content area if possible, or just body
    const content = doc.body.innerText || doc.body.textContent || '';
    
    // Clean up excessive whitespace
    const cleanText = content.replace(/\s+/g, ' ').trim();
    
    return cleanText;
  } catch (error) {
    console.error("Failed to fetch from Ravenol:", error);
    return null;
  }
}
