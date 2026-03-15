export async function fetchRavenolData(query: string, hint?: string): Promise<string | null> {
  try {
    // 1. Search for the query (VIN or car details)
    const searchUrl = `https://podbor.ravenol.ru/search/?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(`/api/proxy/ravenol?url=${encodeURIComponent(searchUrl)}`);
    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();

    let carHtml = '';
    
    // Check if this is already a car page (redirected)
    if (searchHtml.includes('ravwidg-results') || searchHtml.includes('ravwidg-car-info') || searchHtml.includes('ravwidg-unit-title')) {
      carHtml = searchHtml;
    } else {
      // 2. Extract the car page URLs from search results
      const matches = Array.from(searchHtml.matchAll(/<a href="(\/[0-9]+-[a-z-]+\/[^"]+)" class="ravwidg-list-link">/g));
      
      if (matches.length === 0) return null;
      
      // If there are multiple results and we have a hint, try to find the best match
      let bestMatch = matches[0][1];
      if (matches.length > 1 && hint) {
        const hintLower = hint.toLowerCase();
        const hintWords = hintLower.split(' ').filter(word => word.length > 2);
        
        let maxMatches = 0;
        for (const m of matches) {
          const linkText = m[0].toLowerCase();
          const matchCount = hintWords.filter(word => linkText.includes(word)).length;
          
          if (matchCount > maxMatches) {
            maxMatches = matchCount;
            bestMatch = m[1];
          }
        }
        
        console.log(`Ravenol search for "${query}" returned ${matches.length} results. Hint: "${hint}". Picked: ${bestMatch}`);
      }

      const carUrl = `https://podbor.ravenol.ru${bestMatch}`;

      // 3. Fetch the car page via proxy
      const carRes = await fetch(`/api/proxy/ravenol?url=${encodeURIComponent(carUrl)}`);
      if (!carRes.ok) return null;
      carHtml = await carRes.text();
    }

    // 4. Strip HTML tags to reduce token usage
    const parser = new DOMParser();
    const doc = parser.parseFromString(carHtml, 'text/html');
    
    // Try to get the car title specifically
    const title = doc.querySelector('.ravwidg-car-title')?.textContent || 
                  doc.querySelector('h1')?.textContent || 
                  '';

    // Extract text from the main content area
    const content = doc.body.innerText || doc.body.textContent || '';
    
    // Clean up excessive whitespace
    const cleanText = `${title}\n${content}`.replace(/\s+/g, ' ').trim();
    
    return cleanText;
  } catch (error) {
    console.error("Failed to fetch from Ravenol:", error);
    return null;
  }
}
