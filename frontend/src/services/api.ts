export async function fetchInventory() {
  const res = await fetch("/api/inventario");
  if (!res.ok) throw new Error("Falha ao carregar inventário");
  return res.json();
}

export async function searchContent(query: string) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Falha na busca");
  return res.json();
}
