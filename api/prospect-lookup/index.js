function extractCity(formattedAddress) {
  if (!formattedAddress) return "";
  const parts = formattedAddress.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2];
    return cityPart.replace(/^\d{4,5}\s*/, "").trim();
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: "Le paramètre 'q' est requis" });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GOOGLE_API_KEY non configurée" });
  }

  try {
    // Detect if it's a Google Maps URL or a plain business name
    let query = q.trim();
    if (query.includes("google") && query.includes("maps")) {
      const match = query.match(/\/maps\/place\/([^/@]+)/);
      if (match) {
        query = decodeURIComponent(match[1].replace(/\+/g, " "));
      }
    }

    // Step 1: Find all candidates (Text Search returns multiple results)
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.status !== "OK" || !searchData.results?.length) {
      return res.status(404).json({ error: "Aucun business trouvé pour cette recherche" });
    }

    // Step 2: Get details for each candidate (max 5)
    const candidates = searchData.results.slice(0, 5);
    const fields = "name,formatted_phone_number,website,formatted_address,rating,user_ratings_total";

    const results = await Promise.all(
      candidates.map(async (candidate) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${candidate.place_id}&fields=${fields}&key=${apiKey}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();

        if (detailsData.status !== "OK") return null;

        const r = detailsData.result;
        return {
          placeId: candidate.place_id,
          name: r.name || "",
          phone: r.formatted_phone_number || "",
          website: r.website || "",
          address: r.formatted_address || "",
          city: extractCity(r.formatted_address),
          rating: r.rating || null,
          reviewCount: r.user_ratings_total || null,
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${candidate.place_id}`,
        };
      })
    );

    const validResults = results.filter(Boolean);

    if (!validResults.length) {
      return res.status(404).json({ error: "Aucun business trouvé" });
    }

    return res.status(200).json(validResults);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
