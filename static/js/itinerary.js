document.addEventListener("DOMContentLoaded", async () => {
 const $ = id => document.getElementById(id);
 const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const read = key => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
 let plan = {};
 try { plan = JSON.parse(localStorage.getItem("generatedTravelItinerary") || "{}"); } catch {}
 let chosen = Array.isArray(plan.selected_places) ? plan.selected_places : read("selectedTripPlaces");
 const destination = plan.destination || plan.requirements?.destination || "Your destination";
 const days = Math.max(1, Number(plan.days) || Math.ceil(Math.max(chosen.length,1)/3));

 // Remove destination-level entries and encyclopedia/list articles: these are not visitable attractions.
 const destinationAliases = {
  bombay: ["bombay", "mumbai"],
  mumbai: ["bombay", "mumbai"]
};
 const destinationNames = destinationAliases[destination.toLowerCase()] || [destination.toLowerCase()];
 const isGeneric = p => {
  const n = String(p.name || "").trim().toLowerCase();
  const c = String(p.category || "").toLowerCase();
  return !n || destinationNames.includes(n) ||
   /^list of (tourist )?attractions/.test(n) ||
   /^tourist attractions (in|of)/.test(n) ||
   /^(city|town|district|state|region|destination)$/.test(c) ||
   n.startsWith("list of places to visit");
 };
 chosen = chosen.filter(p => p && !isGeneric(p));

 $("tripTitle").textContent = `${destination} · ${days} ${days===1?"day":"days"}`;
 $("tripIntro").textContent = chosen.length
   ? `A visit plan covering ${chosen.length} selected ${chosen.length===1?"attraction":"attractions"} in a clear stop-by-stop order.`
   : `Your trip to ${destination}. Add individual attractions in the planner to build your sightseeing route.`;
 $("itineraryMeta").innerHTML = [
  `📍 ${esc(plan.from_location || "Starting point not specified")} → ${esc(destination)}`,
  `📅 ${days} ${days===1?"day":"days"}`,
  `👥 ${esc(plan.travellers || 1)} traveller(s)`,
  `💰 Budget: ${esc(plan.budget || "Flexible")}`,
  `🚗 ${esc(plan.transport || "Not specified")}`
 ].map(x=>`<span class="itinerary-chip">${x}</span>`).join("");
 $("tripStats").innerHTML = [
  [days,"TRAVEL DAYS"],[chosen.length,"ATTRACTIONS"],[new Set(chosen.map(p=>p.category).filter(Boolean)).size,"PLACE TYPES"]
 ].map(([n,label])=>`<article class="trip-stat"><strong>${esc(n)}</strong><span>${label}</span></article>`).join("");

 // Order stops geographically where coordinates exist; otherwise preserve user's selection order.
 const remaining = chosen.map((p,i)=>({...p,_original:i}));
 const ordered = []; let current = null;
 while (remaining.length) {
  let best = 0, bestDistance = Infinity;
  if (current && Number.isFinite(Number(current.latitude)) && Number.isFinite(Number(current.longitude))) {
   remaining.forEach((p,i)=>{
    if (Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))) {
     const d = Math.hypot(Number(p.latitude)-Number(current.latitude), Number(p.longitude)-Number(current.longitude));
     if (d < bestDistance) { bestDistance=d; best=i; }
    }
   });
  }
  current = remaining.splice(best,1)[0]; ordered.push(current);
 }
 const buckets = Array.from({length:days},()=>[]);
 ordered.forEach((p,i)=>buckets[Math.min(days-1,Math.floor(i*days/Math.max(ordered.length,1)))].push(p));
 const mapLink = p => p.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.name||"")+" "+destination)}`;
 $("itineraryDays").innerHTML = buckets.map((places,i)=>`
  <section class="day-card">
   <div class="day-top"><h3>Day ${i+1} · ${esc(destination)}</h3><span>${places.length} ${places.length===1?"stop":"stops"}</span></div>
   ${places.length ? `<div class="stop-list">${places.map((p,j)=>`
    <article class="stop-row">
     <div class="stop-number">${j+1}</div>
     <div class="stop-info"><strong>${esc(p.name)}</strong></div>
     <a class="stop-map" href="${esc(mapLink(p))}" target="_blank" rel="noopener">Open map ↗</a>
    </article>`).join("")}</div>` : `<div class="empty-state">No attractions assigned to this day.</div>`}
  </section>`).join("") || `<section class="day-card"><div class="empty-state">No individual attractions were selected. Return to the planner and add places such as landmarks, gardens, museums or viewpoints.</div></section>`;

 const mapsSearch = (type) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(type+" near "+destination)}`;
 function renderBusinessCards(items, type, targetId, moreId) {
  const target=$(targetId), more=$(moreId);
  if (!items || !items.length) {
   target.innerHTML=`<div class="empty-state">No live ${type} listings were returned for ${esc(destination)}. <a href="${mapsSearch(type)}" target="_blank" rel="noopener">Search ${type} near ${esc(destination)} on Maps ↗</a></div>`;
   more.innerHTML="";
   return;
  }
  const icon=type==="hotels"?"🏨":"🍽️";
  const card=item=>`<article class="recommendation-card">
   <div class="business-visual">${icon}</div>
   <div class="business-body">
    <h3>${esc(item.name)}</h3>
    <p>${esc(item.category || (type==="hotels"?"Accommodation":"Restaurant"))}${item.distance_km!==undefined?` · about ${esc(item.distance_km)} km away`:""}</p>
    ${item.phone?`<p>☎ ${esc(item.phone)}</p>`:""}
    <div class="business-actions"><a href="${esc(item.map_url || mapsSearch(type))}" target="_blank" rel="noopener">View location ↗</a>
    ${item.website?`<a href="${esc(item.website)}" target="_blank" rel="noopener">Website ↗</a>`:""}</div>
   </div></article>`;
  const initial=4;
  target.innerHTML=items.slice(0,initial).map(card).join("");
  if(items.length>initial){
   more.innerHTML=`<button class="view-more" type="button">View more (${items.length-initial})</button>`;
   more.querySelector("button").addEventListener("click",()=>{
    target.innerHTML=items.map(card).join(""); more.innerHTML="";
   });
  } else more.innerHTML="";
 }
 try {
  const response=await fetch(`/api/nearby?destination=${encodeURIComponent(destination)}`);
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || "Nearby listings unavailable");
  renderBusinessCards(data.hotels||[],"hotels","hotelResults","hotelMore");
  renderBusinessCards(data.restaurants||[],"restaurants","restaurantResults","restaurantMore");
 } catch(error) {
  renderBusinessCards([],"hotels","hotelResults","hotelMore");
  renderBusinessCards([],"restaurants","restaurantResults","restaurantMore");
 }
});
