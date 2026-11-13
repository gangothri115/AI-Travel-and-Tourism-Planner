document.addEventListener("DOMContentLoaded", async () => {
 const $ = id => document.getElementById(id);
 const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const read = key => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
 let plan = {};
 try { plan = JSON.parse(localStorage.getItem("generatedTravelItinerary") || "{}"); } catch {}
 const chosen = Array.isArray(plan.selected_places) ? plan.selected_places : read("selectedTripPlaces");
 const destination = plan.destination || plan.requirements?.destination || "Your destination";
 const days = Math.max(1, Number(plan.days) || Math.ceil(Math.max(chosen.length,1)/3));
 const title = plan.trip_name || `${destination} · ${days}-day journey`;
 $("tripTitle").textContent = title;
 $("tripIntro").textContent = chosen.length
   ? `A personalised route through ${chosen.length} selected ${chosen.length===1?"place":"places"}, paced across ${days} ${days===1?"day":"days"}. Nearby stays and food listings are included to help complete your plan.`
   : `Your ${days}-day travel outline for ${destination}. Add attractions in the planner to build a detailed sightseeing schedule.`;
 $("itineraryMeta").innerHTML = [
  `📍 ${esc(plan.from_location || "Starting point not specified")} → ${esc(destination)}`,
  `📅 ${days} ${days===1?"day":"days"}`,
  `👥 ${esc(plan.travellers || 1)} traveller(s)`,
  `💰 Budget: ${esc(plan.budget || "Flexible")}`,
  `🚗 ${esc(plan.transport || "Transport not specified")}`
 ].map(x=>`<span class="itinerary-chip">${x}</span>`).join("");
 $("tripStats").innerHTML = [
  [days,"TRAVEL DAYS"],[chosen.length,"SELECTED PLACES"],[new Set(chosen.map(p=>p.category).filter(Boolean)).size,"PLACE CATEGORIES"]
 ].map(([n,label])=>`<article class="trip-stat"><strong>${esc(n)}</strong><span>${label}</span></article>`).join("");

 // Greedy nearest-neighbour ordering when actual coordinates are present.
 const remaining = chosen.map((p,i)=>({...p,_original:i}));
 const ordered = [];
 let current = null;
 while (remaining.length) {
  let bestIndex = 0;
  if (current && Number.isFinite(Number(current.latitude)) && Number.isFinite(Number(current.longitude))) {
   let bestDistance = Infinity;
   remaining.forEach((p,i)=>{
    if (Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))) {
     const d = Math.hypot(Number(p.latitude)-Number(current.latitude), Number(p.longitude)-Number(current.longitude));
     if (d < bestDistance) { bestDistance=d; bestIndex=i; }
    }
   });
  }
  current = remaining.splice(bestIndex,1)[0];
  ordered.push(current);
 }
 const buckets = Array.from({length:days},()=>[]);
 // Keep every selected place; distribute as evenly as possible across days.
 ordered.forEach((p,i)=>buckets[Math.min(days-1,Math.floor(i*days/Math.max(ordered.length,1)))].push(p));
 const dayNames = ["A gentle start","Explore & discover","Local highlights","A deeper experience","The final chapter"];
 const mapLink = p => p.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.name||"")+" "+destination)}`;
 const placeCards = (places) => places.map((p,i)=>`
  <div class="timeline-place">
   <div class="timeline-marker">${["🌅","🏛️","🌿","📸","✨"][i%5]}</div>
   <div class="timeline-content">
    <strong>${esc(p.name || "Selected attraction")}</strong>
    <small>${esc(p.category || "Sightseeing")} ${p.description ? "· "+esc(p.description) : ""}</small>
    <a class="place-link" href="${esc(mapLink(p))}" target="_blank" rel="noopener">View location ↗</a>
   </div>
  </div>`).join("");
 $("itineraryDays").innerHTML = buckets.map((places,i)=>`
  <section class="day-card">
   <div class="day-top"><h3>Day ${i+1} · ${esc(destination)}</h3><span>${places.length} ${places.length===1?"stop":"stops"} · ${esc(dayNames[i%dayNames.length])}</span></div>
   <div class="day-layout">
    <div class="place-timeline">${places.length ? placeCards(places) : `<div class="empty-state">Keep this day flexible for travel, rest or exploring nearby streets.</div>`}</div>
    <aside class="day-side">
     <h4>✨ Day notes</h4>
     <p>${places.length ? `Start with ${esc(places[0].name)}${places.length>1?` and continue through ${places.length-1} more selected ${places.length===2?"stop":"stops"}`:""}.` : "Use this day for arrival, departure or a relaxed break."}</p>
     <p>Plan travel time between stops and check opening hours before leaving.</p>
     <p>🍴 Food: choose a café or restaurant close to your final stop.</p>
     <p>🛏️ Stay: choose accommodation convenient for the next day's first stop.</p>
    </aside>
   </div>
  </section>`).join("") || `<div class="empty-state">No itinerary data found. Return to the planner and add places to your trip.</div>`;

 // Nearby hotels and restaurants come from the backend's OpenStreetMap lookup.
 function renderBusinesses(items, type) {
  if (!items?.length) return `<div class="empty-state">No live ${type} listings were returned. <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(type+" near "+destination)}" target="_blank" rel="noopener">Search ${type} near ${esc(destination)} on Maps ↗</a></div>`;
  return `<div class="recommendation-grid">${items.map(item=>`
   <article class="recommendation-card">
    <h4>${esc(item.name)}</h4>
    <p>${esc(item.category || type)} · approximately ${esc(item.distance_km)} km from destination centre</p>
    ${item.phone?`<p>☎ ${esc(item.phone)}</p>`:""}
    ${item.website?`<p><a href="${esc(item.website)}" target="_blank" rel="noopener">Website ↗</a></p>`:""}
    <a href="${esc(item.map_url)}" target="_blank" rel="noopener">View on map ↗</a>
   </article>`).join("")}</div>`;
 }
 try {
  const response = await fetch(`/api/nearby?destination=${encodeURIComponent(destination)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nearby listings are unavailable.");
  $("hotelResults").innerHTML = renderBusinesses(data.hotels,"hotels");
  $("restaurantResults").innerHTML = renderBusinesses(data.restaurants,"restaurants");
  if (data.notice) {
   const note = `<p style="font-size:12px;color:#8796a5;margin-top:12px">${esc(data.notice)}</p>`;
   $("hotelResults").insertAdjacentHTML("beforeend",note);
   $("restaurantResults").insertAdjacentHTML("beforeend",note);
  }
 } catch(error) {
  const fallback = type => `<div class="empty-state">${esc(error.message)} <br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(type+" near "+destination)}" target="_blank" rel="noopener">Search ${type} on Maps ↗</a></div>`;
  $("hotelResults").innerHTML = fallback("hotels");
  $("restaurantResults").innerHTML = fallback("restaurants");
 }
});
