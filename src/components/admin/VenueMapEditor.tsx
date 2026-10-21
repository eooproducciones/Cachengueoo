import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Crosshair,
  Layers,
  Sparkles,
  Info,
  Sliders,
  ExternalLink,
  Navigation2,
  AlertCircle,
} from 'lucide-react';
import { VenueConfig, VenueLocation } from '../../types';
import { DEFAULT_LOCATIONS } from '../../config/venue';

interface VenueMapEditorProps {
  venueConfig: VenueConfig;
  onSaveConfig: (updated: VenueConfig) => void;
}

// Presets populares en Mendoza para selección inmediata
const MENDOZA_PRESETS = [
  {
    name: 'Cachengueoo - Sede Principal',
    address: 'San Martín & Panamericana, Mendoza',
    city: 'Mendoza',
    province: 'Mendoza',
    latitude: -32.89084,
    longitude: -68.84717,
    radiusMeters: 180,
  },
  {
    name: 'Arena Maipú - Evento Especial',
    address: 'Emilio Civit & Maza, Maipú, Mendoza',
    city: 'Maipú',
    province: 'Mendoza',
    latitude: -32.97745,
    longitude: -68.79090,
    radiusMeters: 300,
  },
  {
    name: 'Auditorio Ángel Bustelo',
    address: 'Virgen del Carmen de Cuyo 610, Mendoza',
    city: 'Mendoza Capital',
    province: 'Mendoza',
    latitude: -32.89940,
    longitude: -68.84650,
    radiusMeters: 220,
  },
  {
    name: 'El Santo Disco',
    address: 'Rodeo del Medio, Maipú',
    city: 'Maipú',
    province: 'Mendoza',
    latitude: -32.98350,
    longitude: -68.71800,
    radiusMeters: 250,
  },
];

export const VenueMapEditor: React.FC<VenueMapEditorProps> = ({ venueConfig, onSaveConfig }) => {
  const [locations, setLocations] = useState<VenueLocation[]>(() => {
    if (venueConfig.locations && venueConfig.locations.length > 0) {
      return venueConfig.locations;
    }
    return DEFAULT_LOCATIONS;
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    return locations[0]?.id || 'loc_cache_principal';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ display_name: string; lat: string; lon: string }>
  >([]);
  const [showSaveNotice, setShowSaveNotice] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const selectedLocation =
    locations.find((l) => l.id === selectedLocationId) || locations[0] || null;

  // Inicializar mapa de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = selectedLocation ? selectedLocation.latitude : -32.89084;
      const initialLng = selectedLocation ? selectedLocation.longitude : -68.84717;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true,
      });

      // CartoDB Dark Matter tiles (estilo nocturno premium acorde a Cachengueoo)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Evento de click en el mapa para posicionar la locación seleccionada
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setLocations((prev) =>
          prev.map((loc) => {
            if (loc.id === selectedLocationId) {
              return {
                ...loc,
                latitude: parseFloat(lat.toFixed(6)),
                longitude: parseFloat(lng.toFixed(6)),
              };
            }
            return loc;
          })
        );
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sincronizar marcadores y círculos de radio cada vez que cambien las locaciones o la selección
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    locations.forEach((loc) => {
      const isSelected = loc.id === selectedLocationId;

      // Círculo del radio permitido
      const circle = L.circle([loc.latitude, loc.longitude], {
        radius: loc.radiusMeters,
        color: loc.isActive ? (isSelected ? '#F39200' : '#EA580C') : '#71717a',
        fillColor: loc.isActive ? '#F39200' : '#3f3f46',
        fillOpacity: loc.isActive ? (isSelected ? 0.28 : 0.14) : 0.05,
        weight: isSelected ? 3 : 1.5,
        dashArray: isSelected ? undefined : '4, 6',
      }).addTo(layerGroup);

      circle.on('click', () => {
        setSelectedLocationId(loc.id);
      });

      // Pin personalizado con nombre del local
      const customIcon = L.divIcon({
        className: 'custom-venue-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            <div style="background: ${
              loc.isActive ? (isSelected ? '#F39200' : '#18181b') : '#27272a'
            }; color: ${
          loc.isActive ? (isSelected ? '#000000' : '#f4f4f5') : '#a1a1aa'
        }; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 12px; white-space: nowrap; box-shadow: 0 6px 18px rgba(0,0,0,0.8); border: 2px solid ${
          isSelected ? '#ffffff' : loc.isActive ? '#F39200' : '#52525b'
        }; display: flex; items-center; gap: 4px;">
              <span>${loc.isActive ? '🔥' : '⏸️'}</span>
              <span>${loc.name}</span>
              <span style="font-size: 9px; opacity: 0.8; font-family: monospace;">(${
                loc.radiusMeters
              }m)</span>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${
              isSelected ? '#ffffff' : loc.isActive ? '#F39200' : '#52525b'
            }; margin-top: -1px;"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: customIcon,
        draggable: isSelected,
      }).addTo(layerGroup);

      marker.on('click', () => {
        setSelectedLocationId(loc.id);
      });

      // Permitir arrastrar el marcador seleccionado
      marker.on('dragend', (e) => {
        const markerTarget = e.target as L.Marker;
        const newPos = markerTarget.getLatLng();
        setLocations((prev) =>
          prev.map((item) =>
            item.id === loc.id
              ? {
                  ...item,
                  latitude: parseFloat(newPos.lat.toFixed(6)),
                  longitude: parseFloat(newPos.lng.toFixed(6)),
                }
              : item
          )
        );
      });
    });
  }, [locations, selectedLocationId]);

  // Centrar mapa en la locación seleccionada
  const handleCenterOnLocation = (loc: VenueLocation) => {
    setSelectedLocationId(loc.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.latitude, loc.longitude], 15, {
        animate: true,
        duration: 1,
      });
    }
  };

  // Buscar dirección con OpenStreetMap Nominatim
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const q = encodeURIComponent(`${searchQuery.trim()}, Mendoza, Argentina`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=4`
      );
      const data = await response.json();
      setSearchResults(data || []);
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 16);
        }
      }
    } catch (err) {
      console.error('Error buscando dirección:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Aplicar resultado de búsqueda a la locación actual
  const handleApplySearchResult = (res: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(parseFloat(res.lat).toFixed(6));
    const lon = parseFloat(parseFloat(res.lon).toFixed(6));

    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === selectedLocationId
          ? {
              ...loc,
              address: res.display_name.split(',')[0] || loc.address,
              latitude: lat,
              longitude: lon,
            }
          : loc
      )
    );

    setSearchResults([]);
    setSearchQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 16);
    }
  };

  // Aplicar preset directo
  const handleApplyPreset = (preset: (typeof MENDOZA_PRESETS)[0]) => {
    if (!selectedLocation) return;
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === selectedLocationId
          ? {
              ...loc,
              name: preset.name,
              address: preset.address,
              city: preset.city,
              province: preset.province,
              latitude: preset.latitude,
              longitude: preset.longitude,
              radiusMeters: preset.radiusMeters,
              isActive: true,
            }
          : loc
      )
    );

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.latitude, preset.longitude], 15);
    }
  };

  // Agregar nueva locación
  const handleAddNewLocation = () => {
    const center = mapInstanceRef.current?.getCenter() || { lat: -32.9774, lng: -68.7909 };
    const newId = `loc_${Date.now()}`;
    const newLocation: VenueLocation = {
      id: newId,
      name: `Nueva Locación #${locations.length + 1}`,
      address: 'Mendoza, Argentina',
      city: 'Mendoza',
      province: 'Mendoza',
      country: 'Argentina',
      latitude: parseFloat(center.lat.toFixed(6)),
      longitude: parseFloat(center.lng.toFixed(6)),
      radiusMeters: 200,
      isActive: true,
    };

    setLocations([...locations, newLocation]);
    setSelectedLocationId(newId);
  };

  // Eliminar locación
  const handleDeleteLocation = (id: string) => {
    if (locations.length <= 1) {
      alert('Debe existir al menos una locación configurada para el club.');
      return;
    }
    const filtered = locations.filter((l) => l.id !== id);
    setLocations(filtered);
    if (selectedLocationId === id) {
      setSelectedLocationId(filtered[0].id);
    }
  };

  // Alternar estado activo / inactivo
  const handleToggleActive = (id: string) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, isActive: !loc.isActive } : loc))
    );
  };

  // Guardar configuración completa
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    const primary = locations[0] || DEFAULT_LOCATIONS[0];
    const updatedConfig: VenueConfig = {
      ...venueConfig,
      name: primary.name,
      city: primary.city,
      province: primary.province,
      latitude: primary.latitude,
      longitude: primary.longitude,
      radiusMeters: primary.radiusMeters,
      locations,
    };

    onSaveConfig(updatedConfig);
    setShowSaveNotice(true);
    setTimeout(() => setShowSaveNotice(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header descriptivo */}
      <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <MapPin className="w-4 h-4 text-[#F39200]" />
            <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest">
              PERÍMETRO GPS & GEO-FENCING
            </span>
          </div>
          <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">
            CONFIGURACIÓN GEOGRÁFICA <span className="text-[#F39200]">MULTILOCACIÓN</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Podés configurar múltiples locaciones simultáneas (ej. Sede Central y Arena Maipú). El
            usuario validará presencia si está dentro del radio de cualquiera de las locaciones
            activas.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddNewLocation}
          className="h-11 px-4 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Agregar Locación</span>
        </button>
      </div>

      {showSaveNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            ¡Configuración geográfica guardada con éxito! Las nuevas locaciones y radios ya están
            activos en la validación de presencia.
          </span>
        </div>
      )}

      {/* Grid Principal: Mapa interactivo + Selector / Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Lado Izquierdo: Mapa interactivo con círculos de radio */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#F39200]" />
                Mapa en vivo de Mendoza (Hacé click para mover el punto)
              </span>
              <span className="text-[11px] text-zinc-400">
                {locations.filter((l) => l.isActive).length} de {locations.length} activas
              </span>
            </div>

            {/* Contenedor del Mapa Leaflet */}
            <div className="relative w-full h-[400px] sm:h-[460px] rounded-2xl overflow-hidden border border-zinc-800 shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              {/* Botón flotante para re-centrar en locación activa */}
              {selectedLocation && (
                <button
                  type="button"
                  onClick={() => handleCenterOnLocation(selectedLocation)}
                  className="absolute bottom-3 right-3 z-10 p-2.5 rounded-xl bg-zinc-900/90 hover:bg-black border border-zinc-700 text-[#F39200] hover:text-white shadow-xl cursor-pointer text-xs font-bold flex items-center gap-1.5 backdrop-blur-md"
                  title="Centrar en la locación seleccionada"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>Centrar</span>
                </button>
              )}

              {/* Leyenda flotante */}
              <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-[10px] text-zinc-300 space-y-1 pointer-events-none shadow-lg">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F39200]"></span>
                  <span>Seleccionada / Activa</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600"></span>
                  <span>Inactiva</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
              <span>💡 Arrastrá el marcador o hacé click en el mapa para ajustar coordenadas.</span>
              <span className="font-mono text-zinc-500">
                Lat: {selectedLocation?.latitude} · Lon: {selectedLocation?.longitude}
              </span>
            </div>
          </div>

          {/* Buscador de Direcciones & Presets Rápidos */}
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
            <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
              BUSCAR DIRECCIÓN O SELECCIONAR PRESET
            </span>

            {/* Input de Búsqueda */}
            <form onSubmit={handleSearchAddress} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej: Emilio Civit y Maza, Arena Maipú, Mendoza..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-[#F39200]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors shrink-0"
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {/* Resultados de búsqueda Nominatim */}
            {searchResults.length > 0 && (
              <div className="p-2 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 px-2 block">
                  Resultados encontrados:
                </span>
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplySearchResult(res)}
                    className="w-full text-left p-2 rounded-xl hover:bg-zinc-800 text-xs text-white cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <span className="truncate pr-2">{res.display_name}</span>
                    <span className="text-[10px] text-[#F39200] font-bold shrink-0">Aplicar →</span>
                  </button>
                ))}
              </div>
            )}

            {/* Presets de Mendoza recomendados */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-zinc-400 block font-medium">
                Puntos de evento habituales en Mendoza:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MENDOZA_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-[#F39200]/50 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-white group-hover:text-[#F39200] transition-colors">
                        {p.name}
                      </strong>
                      <span className="text-[9px] font-mono text-zinc-400">{p.radiusMeters}m</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block truncate">{p.address}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Editor de la Locación Seleccionada y Lista de Locaciones */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card de Configuración de la Locación Seleccionada */}
          {selectedLocation ? (
            <div className="bg-[#121217] border border-[#F39200]/40 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                    EDITANDO PERÍMETRO
                  </span>
                  <h4 className="text-sm font-bold text-white truncate max-w-[200px]">
                    {selectedLocation.name}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(selectedLocation.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors border ${
                      selectedLocation.isActive
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {selectedLocation.isActive ? 'Activa Esta Noche' : 'Desactivada'}
                  </button>
                </div>
              </div>

              {/* Nombre y Dirección */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">
                    Nombre de la Locación
                  </label>
                  <input
                    type="text"
                    value={selectedLocation.name}
                    onChange={(e) =>
                      setLocations((prev) =>
                        prev.map((l) =>
                          l.id === selectedLocation.id ? { ...l, name: e.target.value } : l
                        )
                      )
                    }
                    placeholder="Ej. Arena Maipú, Sede Central..."
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Dirección</label>
                  <input
                    type="text"
                    value={selectedLocation.address || ''}
                    onChange={(e) =>
                      setLocations((prev) =>
                        prev.map((l) =>
                          l.id === selectedLocation.id ? { ...l, address: e.target.value } : l
                        )
                      )
                    }
                    placeholder="Ej. Emilio Civit & Maza, Maipú"
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>

                {/* SLIDER DE RADIO PERMITIDO (CON CONTROLES PRESET) */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#F39200]" />
                      Radio Permitido
                    </label>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#F39200]/20 text-[#F39200] font-black font-mono text-xs">
                      {selectedLocation.radiusMeters} metros
                    </span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="2000"
                    step="10"
                    value={selectedLocation.radiusMeters}
                    onChange={(e) =>
                      setLocations((prev) =>
                        prev.map((l) =>
                          l.id === selectedLocation.id
                            ? { ...l, radiusMeters: parseInt(e.target.value) || 150 }
                            : l
                        )
                      )
                    }
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#F39200]"
                  />

                  {/* Botones de radio rápido */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[100, 180, 250, 300, 500, 1000].map((rad) => (
                      <button
                        key={rad}
                        type="button"
                        onClick={() =>
                          setLocations((prev) =>
                            prev.map((l) =>
                              l.id === selectedLocation.id ? { ...l, radiusMeters: rad } : l
                            )
                          )
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono cursor-pointer transition-all border ${
                          selectedLocation.radiusMeters === rad
                            ? 'bg-[#F39200] text-black font-bold border-[#F39200]'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                        }`}
                      >
                        {rad}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordenadas GPS numéricas */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Latitud</label>
                    <input
                      type="number"
                      step="any"
                      value={selectedLocation.latitude}
                      onChange={(e) =>
                        setLocations((prev) =>
                          prev.map((l) =>
                            l.id === selectedLocation.id
                              ? { ...l, latitude: parseFloat(e.target.value) || 0 }
                              : l
                          )
                        )
                      }
                      className="w-full h-9 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-[11px] focus:outline-none focus:border-[#F39200]"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Longitud</label>
                    <input
                      type="number"
                      step="any"
                      value={selectedLocation.longitude}
                      onChange={(e) =>
                        setLocations((prev) =>
                          prev.map((l) =>
                            l.id === selectedLocation.id
                              ? { ...l, longitude: parseFloat(e.target.value) || 0 }
                              : l
                          )
                        )
                      }
                      className="w-full h-9 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-[11px] focus:outline-none focus:border-[#F39200]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 text-center text-xs text-zinc-400">
              Seleccioná una locación para editar su perímetro.
            </div>
          )}

          {/* Lista de Locaciones Configuradas */}
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Navigation2 className="w-3.5 h-3.5 text-[#F39200]" />
                Locaciones Configuradas ({locations.length})
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {locations.filter((l) => l.isActive).length} Activas
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
              {locations.map((loc) => {
                const isSelected = loc.id === selectedLocationId;
                return (
                  <div
                    key={loc.id}
                    onClick={() => handleCenterOnLocation(loc)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-zinc-850 border-[#F39200] shadow-md shadow-[#F39200]/10'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            loc.isActive ? 'bg-emerald-400' : 'bg-zinc-600'
                          }`}
                        />
                        <h5 className="text-xs font-bold text-white truncate">{loc.name}</h5>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {loc.address || `${loc.city}, ${loc.province}`} · Radio:{' '}
                        <strong className="text-zinc-200">{loc.radiusMeters}m</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(loc.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          loc.isActive
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                        title="Activar o desactivar para los eventos de esta noche"
                      >
                        {loc.isActive ? 'Activa' : 'Off'}
                      </button>

                      {locations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc.id)}
                          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-950 text-zinc-400 hover:text-red-400 cursor-pointer transition-colors"
                          title="Eliminar esta locación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón Principal para Guardar Todo */}
          <button
            type="button"
            onClick={handleSaveAll}
            className="w-full h-12 rounded-2xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xl shadow-[#F39200]/25 active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Guardar Configuración Geográfica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
