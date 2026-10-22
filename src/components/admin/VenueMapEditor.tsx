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
  Sliders,
  AlertCircle,
  Building2,
  Edit3,
  Save,
  Navigation,
} from 'lucide-react';
import { VenueConfig, VenueLocation } from '../../types';
import { deleteVenueLocationFromSupabase } from '../../config/venue';


interface VenueMapEditorProps {
  venueConfig: VenueConfig;
  onSaveConfig: (updated: VenueConfig) => void;
}

export const VenueMapEditor: React.FC<VenueMapEditorProps> = ({ venueConfig, onSaveConfig }) => {
  // Inicializar sin locaciones por defecto (lista vacía)
  const [locations, setLocations] = useState<VenueLocation[]>(() => {
    // Si viene con locaciones guardadas por el usuario, las usamos.
    // Si son las de prueba antiguas, limpiamos para que esté vacía como pidió el usuario.
    const saved = venueConfig.locations || [];
    const isOldMock =
      saved.length === 2 &&
      saved[0]?.id === 'loc_cache_principal' &&
      saved[1]?.id === 'loc_arena_maipu';
    if (isOldMock) return [];
    return saved;
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(() => {
    return locations[0]?.id || null;
  });

  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastText, setToastText] = useState<string>(
    'Configuración guardada. Los cambios de ubicación y radio ya están activos.'
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const CARTO_API_KEY =
    import.meta.env.VITE_CARTO_API_KEY || 'cb1_4rky_1_815346443149bf447137be7b';

  const [mapLayer, setMapLayer] = useState<
    'google_streets' | 'google_hybrid' | 'carto_voyager' | 'carto_dark'
  >('google_streets');
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [cartoKeyInput, setCartoKeyInput] = useState(
    import.meta.env.VITE_CARTO_API_KEY || 'cb1_4rky_1_815346443149bf447137be7b'
  );

  const selectedLocation = locations.find((l) => l.id === selectedLocationId) || null;

  const createTileLayer = (mode: 'google_streets' | 'google_hybrid' | 'carto_voyager' | 'carto_dark') => {
    let url = '';
    let attribution = '';
    let subdomains: string | string[] = 'abc';
    let maxZoom = 20;

    switch (mode) {
      case 'google_streets':
        url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        attribution = '&copy; Google Maps';
        maxZoom = 21;
        break;
      case 'google_hybrid':
        url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        attribution = '&copy; Google Maps Satélite';
        maxZoom = 21;
        break;
      case 'carto_voyager':
        url = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKeyInput}`;
        attribution = '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap';
        subdomains = 'abcd';
        break;
      case 'carto_dark':
        url = `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoKeyInput}`;
        attribution = '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap';
        subdomains = 'abcd';
        break;
    }

    const layer = L.tileLayer(url, {
      attribution,
      subdomains,
      maxZoom,
    });

    // En caso de que CARTO falle o la key no esté activada aún, respaldar automáticamente
    layer.on('tileerror', (e) => {
      const tile = e.tile as HTMLImageElement;
      if (tile && !tile.dataset.fallback) {
        tile.dataset.fallback = 'true';
        const coords = (e as any).coords;
        if (coords) {
          tile.src = `https://mt1.google.com/vt/lyrs=m&x=${coords.x}&y=${coords.y}&z=${coords.z}`;
        }
      }
    });

    return layer;
  };

  // Actualizar capa de mosaicos cuando cambia la selección de mapa
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    const newTileLayer = createTileLayer(mapLayer).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
    mapInstanceRef.current.invalidateSize();
  }, [mapLayer, cartoKeyInput]);

  // Inicializar mapa de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Coordenadas iniciales de Mendoza
      const defaultLat = selectedLocation ? selectedLocation.latitude : -32.89084;
      const defaultLng = selectedLocation ? selectedLocation.longitude : -68.84717;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 13,
        zoomControl: true,
      });

      const tileLayer = createTileLayer(mapLayer).addTo(map);
      tileLayerRef.current = tileLayer;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Asegurar que Leaflet calcule el tamaño del contenedor tras montarse
      setTimeout(() => map.invalidateSize(), 50);
      setTimeout(() => map.invalidateSize(), 200);
      setTimeout(() => map.invalidateSize(), 600);
      setTimeout(() => map.invalidateSize(), 200);
      setTimeout(() => map.invalidateSize(), 600);

      // Click en el mapa para fijar o mover la locación seleccionada
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setLocations((prev) => {
          if (prev.length === 0) {
            // Si no hay ninguna, crear una automáticamente al hacer click
            const newId = `loc_${Date.now()}`;
            setSelectedLocationId(newId);
            return [
              {
                id: newId,
                name: 'Nueva Locación',
                address: `Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`,
                city: 'Mendoza',
                province: 'Mendoza',
                country: 'Argentina',
                latitude: parseFloat(lat.toFixed(6)),
                longitude: parseFloat(lng.toFixed(6)),
                radiusMeters: 200,
                isActive: true,
              },
            ];
          }

          // Si hay una seleccionada, moverla al punto clickeado
          return prev.map((loc) => {
            if (loc.id === selectedLocationId) {
              return {
                ...loc,
                latitude: parseFloat(lat.toFixed(6)),
                longitude: parseFloat(lng.toFixed(6)),
              };
            }
            return loc;
          });
        });
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualizar marcadores y círculos en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    locations.forEach((loc) => {
      const isSelected = loc.id === selectedLocationId;

      // Círculo que delimita el rango permitido
      const circle = L.circle([loc.latitude, loc.longitude], {
        radius: loc.radiusMeters,
        color: loc.isActive ? (isSelected ? '#F39200' : '#EA580C') : '#71717a',
        fillColor: loc.isActive ? '#F39200' : '#3f3f46',
        fillOpacity: loc.isActive ? (isSelected ? 0.3 : 0.15) : 0.08,
        weight: isSelected ? 3 : 1.5,
      }).addTo(layerGroup);

      circle.on('click', () => {
        setSelectedLocationId(loc.id);
      });

      // Pin en el mapa con nombre y radio
      const customIcon = L.divIcon({
        className: 'custom-venue-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            <div style="background: ${
              loc.isActive ? (isSelected ? '#F39200' : '#18181b') : '#27272a'
            }; color: ${
          loc.isActive ? (isSelected ? '#000000' : '#f4f4f5') : '#a1a1aa'
        }; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.8); border: 2px solid ${
          isSelected ? '#ffffff' : loc.isActive ? '#F39200' : '#52525b'
        }; display: flex; items-center; gap: 4px;">
              <span>📍</span>
              <span>${loc.name}</span>
              <span style="font-size: 9px; opacity: 0.85; font-family: monospace;">(${
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

  // Persistir la configuración de locaciones en storage central y emitir evento en vivo
  const persistLocations = (newLocs: VenueLocation[], toastMsg?: string) => {
    const primary = newLocs[0];
    const updated: VenueConfig = {
      ...venueConfig,
      name: primary ? primary.name : 'CACHENGUEOO',
      city: primary ? primary.city : 'Mendoza',
      province: primary ? primary.province : 'Mendoza',
      latitude: primary ? primary.latitude : -32.89084,
      longitude: primary ? primary.longitude : -68.84717,
      radiusMeters: primary ? primary.radiusMeters : 180,
      locations: newLocs,
    };

    onSaveConfig(updated);
    setToastText(
      toastMsg ||
        '✓ Locación guardada. Las personas dentro de este radio podrán habilitar Cachengueoo Match automáticamente por GPS.'
    );
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 4500);
  };

  // Agregar una nueva locación limpia y seleccionarla
  const handleAddLocation = () => {
    const center = mapInstanceRef.current?.getCenter() || { lat: -32.89084, lng: -68.84717 };
    const newId = `loc_${Date.now()}`;
    const newLoc: VenueLocation = {
      id: newId,
      name: `Sede #${locations.length + 1}`,
      address: '',
      city: 'Mendoza',
      province: 'Mendoza',
      country: 'Argentina',
      latitude: parseFloat(center.lat.toFixed(6)),
      longitude: parseFloat(center.lng.toFixed(6)),
      radiusMeters: 200,
      isActive: true,
    };

    const nextList = [...locations, newLoc];
    setLocations(nextList);
    setSelectedLocationId(newId);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([newLoc.latitude, newLoc.longitude], 16);
    }
  };

  // Guardar y activar la locación seleccionada inmediatamente
  const handleSaveSelectedLocation = () => {
    if (!selectedLocation) return;
    persistLocations(
      locations,
      `✓ Locación "${selectedLocation.name}" guardada y seleccionada para validación GPS (${selectedLocation.radiusMeters}m de cobertura).`
    );
  };

  // Eliminar locación
  const handleDeleteLocation = (id: string) => {
    const target = locations.find((l) => l.id === id);
    const filtered = locations.filter((l) => l.id !== id);
    setLocations(filtered);
    if (selectedLocationId === id) {
      setSelectedLocationId(filtered[0]?.id || null);
    }
    deleteVenueLocationFromSupabase(id).catch(() => {});
    persistLocations(
      filtered,
      `Locación "${target?.name || 'seleccionada'}" eliminada de las sedes activas.`
    );
  };


  // Seleccionar locación para editarla en el mapa y formulario
  const handleEditLocation = (loc: VenueLocation) => {
    setSelectedLocationId(loc.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.latitude, loc.longitude], 16);
    }
  };

  // Buscar dirección puntual
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress.trim()) return;

    setIsSearching(true);
    setSearchFeedback(null);

    try {
      const q = encodeURIComponent(`${searchAddress.trim()}, Mendoza, Argentina`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(parseFloat(result.lat).toFixed(6));
        const lon = parseFloat(parseFloat(result.lon).toFixed(6));

        if (selectedLocation) {
          // Asignar a la locación actual
          setLocations((prev) =>
            prev.map((l) =>
              l.id === selectedLocation.id
                ? {
                    ...l,
                    address: searchAddress.trim(),
                    latitude: lat,
                    longitude: lon,
                  }
                : l
            )
          );
        } else {
          // Crear una nueva con esa dirección
          const newId = `loc_${Date.now()}`;
          const newLoc: VenueLocation = {
            id: newId,
            name: searchAddress.trim().split(',')[0] || 'Nueva Locación',
            address: searchAddress.trim(),
            city: 'Mendoza',
            province: 'Mendoza',
            country: 'Argentina',
            latitude: lat,
            longitude: lon,
            radiusMeters: 200,
            isActive: true,
          };
          setLocations((prev) => [...prev, newLoc]);
          setSelectedLocationId(newId);
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 16);
        }
        setSearchFeedback(`Ubicación encontrada y fijada en el mapa.`);
      } else {
        setSearchFeedback('No se encontró la dirección exacta. Podés tocar directamente en el mapa.');
      }
    } catch {
      setSearchFeedback('Error al buscar. Hacé click directamente en el mapa para marcar el punto.');
    } finally {
      setIsSearching(false);
    }
  };

  // Guardar todas las locaciones
  const handleSaveAll = () => {
    persistLocations(locations, '✓ Todas las locaciones guardadas y activas para Cachengueoo Match.');
  };

  return (
    <div className="space-y-5">
      {/* Cabecera minimalista y botón para agregar */}
      <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white font-display uppercase tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#F39200]" />
            Configuración Geográfica
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Marcá los puntos en el mapa y el radio de cobertura para que las personas puedan habilitar Match automáticamente por GPS.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddLocation}
          className="h-10 px-4 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-[#F39200]/25 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Agregar locación</span>
        </button>
      </div>

      {showSavedToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastText}</span>
        </div>
      )}

      {/* Buscador de Dirección Simple */}
      <form
        onSubmit={handleSearchAddress}
        className="p-3 rounded-2xl bg-[#121217] border border-zinc-800 flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            placeholder="Escribí una dirección o lugar (ej. Arena Maipú, Emilio Civit 100, Mendoza)..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-[#F39200]"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors shrink-0"
        >
          {isSearching ? 'Buscando...' : 'Buscar dirección'}
        </button>
      </form>

      {searchFeedback && (
        <p className="text-[11px] text-[#F39200] px-2 -mt-3">{searchFeedback}</p>
      )}

      {/* Mapa interactivo */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">
              Hacé click en cualquier punto del mapa para ubicar o mover la locación
            </span>
            {selectedLocation && (
              <span className="text-[11px] text-[#F39200] font-mono font-bold bg-[#F39200]/10 px-2 py-0.5 rounded-full border border-[#F39200]/20">
                Radio: {selectedLocation.radiusMeters}m
              </span>
            )}
          </div>

          {/* Selector de capa de mapa */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
            <div className="inline-flex rounded-xl bg-zinc-900 border border-zinc-800 p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setMapLayer('google_streets')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  mapLayer === 'google_streets'
                    ? 'bg-[#F39200] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Google Maps
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('google_hybrid')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  mapLayer === 'google_hybrid'
                    ? 'bg-[#F39200] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Satélite
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('carto_voyager')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  mapLayer === 'carto_voyager'
                    ? 'bg-[#F39200] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                CARTO Voyager
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('carto_dark')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  mapLayer === 'carto_dark'
                    ? 'bg-[#F39200] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                CARTO Dark
              </button>
            </div>
          </div>
        </div>

        {mapLayer.startsWith('carto') && (
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Estado de clave CARTO:</strong> Si ves la marca de agua <em>"API KEY REQUIRED"</em>, significa que tu clave aún requiere confirmación por email en tu cuenta de CARTO. Mientras se activa podés usar la vista de <strong>Google Maps</strong> o <strong>Satélite</strong> 100% limpia.
              </p>
            </div>
          </div>
        )}

        <div className="relative w-full h-[420px] min-h-[420px] rounded-2xl overflow-hidden border border-zinc-800 bg-[#18181b]">
          <div
            ref={mapContainerRef}
            className="w-full h-full min-h-[420px] z-0"
            style={{ height: '420px', minHeight: '420px', width: '100%' }}
          />

          {selectedLocation && (
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo(
                    [selectedLocation.latitude, selectedLocation.longitude],
                    16
                  );
                }
              }}
              className="absolute bottom-3 right-3 z-10 p-2.5 rounded-xl bg-zinc-900/95 border border-zinc-700 text-[#F39200] hover:text-white shadow-xl cursor-pointer text-xs font-bold flex items-center gap-1.5 backdrop-blur-md"
              title="Centrar en locación seleccionada"
            >
              <Crosshair className="w-4 h-4" />
              <span>Centrar</span>
            </button>
          )}
        </div>
      </div>

      {/* Si no hay locaciones agregadas */}
      {locations.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121217] border border-dashed border-zinc-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-[#F39200]">
            <MapPin className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No hay locaciones activas</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Hacé click en <strong>"Agregar locación"</strong> o directamente sobre el mapa para fijar
            el primer punto y el rango que abarcará para validar presencia.
          </p>
          <button
            type="button"
            onClick={handleAddLocation}
            className="px-4 py-2 rounded-xl bg-[#F39200] text-black font-extrabold text-xs cursor-pointer hover:bg-[#E08400] transition-colors"
          >
            + Agregar primera locación
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Formulario de la locación seleccionada */}
          {selectedLocation && (
            <div className="p-5 rounded-3xl bg-[#121217] border-2 border-[#F39200]/50 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#F39200] animate-pulse" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Configuración de punto:{' '}
                      <span className="text-[#F39200]">{selectedLocation.name}</span>
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Lat: {selectedLocation.latitude.toFixed(5)}, Lon:{' '}
                      {selectedLocation.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteLocation(selectedLocation.id)}
                  className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar punto</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">
                    Nombre de la locación o evento
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
                    placeholder="Ej. Cachengueoo Sede Central, Arena Maipú..."
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">
                    Dirección o punto de referencia
                  </label>
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
                    placeholder="Ej. Emilio Civit y Maza, Maipú, Mendoza"
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              {/* Rango que necesita que abarque */}
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#F39200]" />
                    Rango que debe abarcar (Radio en metros)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="30"
                      max="3000"
                      step="10"
                      value={selectedLocation.radiusMeters}
                      onChange={(e) =>
                        setLocations((prev) =>
                          prev.map((l) =>
                            l.id === selectedLocation.id
                              ? { ...l, radiusMeters: parseInt(e.target.value) || 100 }
                              : l
                          )
                        )
                      }
                      className="w-20 h-8 px-2 text-right rounded-lg bg-zinc-800 border border-zinc-700 text-[#F39200] font-black font-mono text-sm focus:outline-none focus:border-[#F39200]"
                    />
                    <span className="text-zinc-400 font-mono text-xs">metros</span>
                  </div>
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
                          ? { ...l, radiusMeters: parseInt(e.target.value) || 100 }
                          : l
                      )
                    )
                  }
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#F39200]"
                />
                <div className="flex justify-between text-[11px] text-zinc-500 pt-0.5">
                  <span>50m (Boliche chico)</span>
                  <span className="text-[#F39200] font-bold">
                    Cobertura actual: {selectedLocation.radiusMeters} metros
                  </span>
                  <span>2000m (Predio masivo / Arena)</span>
                </div>
              </div>

              {/* Botón explícito para guardar esta locación */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSaveSelectedLocation}
                  className="w-full h-11 rounded-2xl bg-[#F39200] hover:bg-[#E08400] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-[#F39200]/25 active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar esta locación para validación GPS</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Puntos Seleccionados y Guardados para validación GPS */}
          <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white font-display flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#F39200]" />
                  Puntos seleccionados para Cachengueoo Match ({locations.length})
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Las personas dentro del rango de cualquiera de estos puntos activarán Match automáticamente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddLocation}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-[#F39200] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar otro punto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {locations.map((loc, idx) => {
                const isSel = loc.id === selectedLocationId;
                return (
                  <div
                    key={loc.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSel
                        ? 'bg-zinc-900 border-[#F39200] shadow-md shadow-[#F39200]/10'
                        : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono font-bold text-[#F39200]">
                            #{idx + 1}
                          </span>
                          <strong className="text-sm text-white font-bold block truncate">
                            {loc.name}
                          </strong>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-400 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          Activo GPS
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 truncate">
                        {loc.address || 'Ubicación seleccionada en el mapa'}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                        <span className="font-mono text-[#F39200] font-bold bg-[#F39200]/10 px-2 py-0.5 rounded-md border border-[#F39200]/20">
                          Radio: {loc.radiusMeters} metros
                        </span>
                        <span className="font-mono text-zinc-500 text-[10px]">
                          ({loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => handleEditLocation(loc)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isSel
                            ? 'bg-[#F39200] text-black'
                            : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isSel ? 'Editando ahora' : 'Editar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-500/40 text-xs font-bold text-zinc-400 hover:text-red-400 flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Eliminar esta locación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón general para confirmar y guardar todo */}
          <button
            type="button"
            onClick={handleSaveAll}
            className="w-full h-11 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4 text-[#F39200]" />
            <span>Confirmar y Guardar Todos los Puntos</span>
          </button>
        </div>
      )}
    </div>
  );
};
