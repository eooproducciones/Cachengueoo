import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  Edit3,
  X,
  Crosshair,
  AlertTriangle,
} from 'lucide-react';
import { VenueConfig, VenueLocation } from '../../types';
import { deleteVenueLocationFromSupabase } from '../../config/venue';

interface VenueMapEditorProps {
  venueConfig: VenueConfig;
  onSaveConfig: (updated: VenueConfig) => void;
}

const GOOGLE_MAPS_TILES = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
const DEFAULT_MENDOZA_LAT = -32.89084;
const DEFAULT_MENDOZA_LNG = -68.84717;

export const VenueMapEditor: React.FC<VenueMapEditorProps> = ({ venueConfig, onSaveConfig }) => {
  // Inicializar locaciones desde la configuración guardada
  const [locations, setLocations] = useState<VenueLocation[]>(() => {
    const saved = venueConfig.locations || [];
    const isOldMock =
      saved.length === 2 &&
      saved[0]?.id === 'loc_cache_principal' &&
      saved[1]?.id === 'loc_arena_maipu';
    if (isOldMock) return [];
    return saved;
  });

  // Modal para agregar o editar locación
  const [showModal, setShowModal] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Modal para confirmar eliminación (modelo zona de peligro como usuarios/eventos)
  const [locationToDelete, setLocationToDelete] = useState<VenueLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado del formulario dentro del popup
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formRadius, setFormRadius] = useState<number>(200);
  const [formLat, setFormLat] = useState<number>(DEFAULT_MENDOZA_LAT);
  const [formLng, setFormLng] = useState<number>(DEFAULT_MENDOZA_LNG);

  // Búsqueda de dirección
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Feedback toast
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastText, setToastText] = useState('');

  // Referencias para el mapa Leaflet dentro del popup modal
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Crear o actualizar icono personalizado
  const getCustomPinHtml = (label: string, radius: number) => `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
      <div style="background: #F39200; color: #000000; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.8); border: 2px solid #ffffff; display: flex; align-items: center; gap: 4px;">
        <span>📍</span>
        <span>${label || 'Punto de Evento'}</span>
        <span style="font-size: 9px; opacity: 0.85; font-family: monospace;">(${radius}m)</span>
      </div>
      <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ffffff; margin-top: -1px;"></div>
    </div>
  `;

  // Inicializar o ajustar mapa cuando el popup modal se abre
  useEffect(() => {
    if (!showModal) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Si el mapa ya existe, destruirlo para regenerar limpio
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [formLat, formLng],
        zoom: 15,
        zoomControl: true,
      });

      // Solo Google Maps estándar
      L.tileLayer(GOOGLE_MAPS_TILES, {
        attribution: '&copy; Google Maps',
        maxZoom: 21,
      }).addTo(map);

      // Círculo de cobertura
      const circle = L.circle([formLat, formLng], {
        radius: formRadius,
        color: '#F39200',
        fillColor: '#F39200',
        fillOpacity: 0.22,
        weight: 2.5,
      }).addTo(map);
      circleRef.current = circle;

      // Pin interactivo
      const customIcon = L.divIcon({
        className: 'custom-venue-pin',
        html: getCustomPinHtml(formName, formRadius),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([formLat, formLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      // Evento arrastrar pin
      marker.on('dragend', (e) => {
        const target = e.target as L.Marker;
        const pos = target.getLatLng();
        const nextLat = parseFloat(pos.lat.toFixed(6));
        const nextLng = parseFloat(pos.lng.toFixed(6));
        setFormLat(nextLat);
        setFormLng(nextLng);
        circle.setLatLng([nextLat, nextLng]);
      });

      // Evento click en cualquier punto del mapa
      map.on('click', (e: L.LeafletMouseEvent) => {
        const nextLat = parseFloat(e.latlng.lat.toFixed(6));
        const nextLng = parseFloat(e.latlng.lng.toFixed(6));
        setFormLat(nextLat);
        setFormLng(nextLng);
        marker.setLatLng([nextLat, nextLng]);
        circle.setLatLng([nextLat, nextLng]);
      });

      mapInstanceRef.current = map;

      // Forzar ajuste de dimensiones
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
    }, 120);

    return () => {
      clearTimeout(timer);
    };
  }, [showModal]);

  // Actualizar círculo y pin cuando cambia el radio o el nombre en el formulario
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(formRadius);
    }
    if (markerRef.current) {
      const customIcon = L.divIcon({
        className: 'custom-venue-pin',
        html: getCustomPinHtml(formName, formRadius),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      markerRef.current.setIcon(customIcon);
    }
  }, [formRadius, formName]);

  // Abrir modal para crear nueva locación
  const handleOpenCreateModal = () => {
    setEditingLocationId(null);
    setFormName('');
    setFormAddress('');
    setFormRadius(200);
    setSearchQuery('');
    setSearchFeedback(null);

    // Centrar en la primera locación existente o en Mendoza
    if (locations.length > 0) {
      setFormLat(locations[0].latitude);
      setFormLng(locations[0].longitude);
    } else {
      setFormLat(DEFAULT_MENDOZA_LAT);
      setFormLng(DEFAULT_MENDOZA_LNG);
    }

    setShowModal(true);
  };

  // Abrir modal para editar locación existente
  const handleOpenEditModal = (loc: VenueLocation) => {
    setEditingLocationId(loc.id);
    setFormName(loc.name);
    setFormAddress(loc.address || '');
    setFormRadius(loc.radiusMeters || 200);
    setFormLat(loc.latitude);
    setFormLng(loc.longitude);
    setSearchQuery(loc.address || '');
    setSearchFeedback(null);
    setShowModal(true);
  };

  // Buscar dirección en Mendoza vía OpenStreetMap geocoding
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchFeedback(null);

    try {
      const query = encodeURIComponent(`${searchQuery.trim()}, Mendoza, Argentina`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(parseFloat(item.lat).toFixed(6));
        const lng = parseFloat(parseFloat(item.lon).toFixed(6));

        setFormLat(lat);
        setFormLng(lng);

        if (!formAddress.trim()) {
          setFormAddress(searchQuery.trim());
        }
        if (!formName.trim()) {
          setFormName(searchQuery.trim().split(',')[0]);
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        if (circleRef.current) {
          circleRef.current.setLatLng([lat, lng]);
        }

        setSearchFeedback('✓ Dirección encontrada y ubicada en Google Maps.');
      } else {
        setSearchFeedback('No se encontró la dirección exacta. Podés tocar directamente en el mapa.');
      }
    } catch {
      setSearchFeedback('Error al buscar dirección. Podés marcar el punto directamente en el mapa.');
    } finally {
      setIsSearching(false);
    }
  };

  // Guardar locación (crear o editar)
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) return;

    let nextList: VenueLocation[];
    let toastMessage = '';

    if (editingLocationId) {
      nextList = locations.map((loc) =>
        loc.id === editingLocationId
          ? {
              ...loc,
              name: cleanName,
              address: formAddress.trim(),
              latitude: formLat,
              longitude: formLng,
              radiusMeters: formRadius,
            }
          : loc
      );
      toastMessage = `✓ Locación "${cleanName}" actualizada y sincronizada en la base de datos.`;
    } else {
      const newId = `loc_${Date.now()}`;
      const newLoc: VenueLocation = {
        id: newId,
        name: cleanName,
        address: formAddress.trim(),
        city: 'Mendoza',
        province: 'Mendoza',
        country: 'Argentina',
        latitude: formLat,
        longitude: formLng,
        radiusMeters: formRadius,
        isActive: true,
      };
      nextList = [...locations, newLoc];
      toastMessage = `✓ Locación de evento "${cleanName}" agregada y guardada en la base de datos.`;
    }

    setLocations(nextList);
    setShowModal(false);
    setEditingLocationId(null);

    // Persistir en venueConfig y sincronizar automáticamente con Supabase
    const primary = nextList[0];
    const updated: VenueConfig = {
      ...venueConfig,
      name: primary ? primary.name : venueConfig.name,
      city: primary ? primary.city : 'Mendoza',
      province: primary ? primary.province : 'Mendoza',
      latitude: primary ? primary.latitude : formLat,
      longitude: primary ? primary.longitude : formLng,
      radiusMeters: primary ? primary.radiusMeters : formRadius,
      locations: nextList,
    };

    onSaveConfig(updated);
    setToastText(toastMessage);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 4500);
  };

  // Confirmar eliminación de locación
  const handleConfirmDeleteLocation = async () => {
    if (!locationToDelete) return;
    const targetId = locationToDelete.id;
    const targetName = locationToDelete.name;

    setIsDeleting(true);
    try {
      const filtered = locations.filter((l) => l.id !== targetId);
      setLocations(filtered);
      setLocationToDelete(null);

      // Eliminar de Supabase
      await deleteVenueLocationFromSupabase(targetId);

      // Persistir configuración actualizada
      const primary = filtered[0];
      const updated: VenueConfig = {
        ...venueConfig,
        name: primary ? primary.name : 'CACHENGUEOO',
        city: primary ? primary.city : 'Mendoza',
        province: primary ? primary.province : 'Mendoza',
        latitude: primary ? primary.latitude : DEFAULT_MENDOZA_LAT,
        longitude: primary ? primary.longitude : DEFAULT_MENDOZA_LNG,
        radiusMeters: primary ? primary.radiusMeters : 180,
        locations: filtered,
      };

      onSaveConfig(updated);
      setToastText(`✓ Locación "${targetName}" eliminada de la base de datos y de las sedes activas.`);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 4500);
    } catch (err) {
      console.error('Error al eliminar locación:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera simétrica con el mismo estilo que Gestión de Noches y Eventos */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#F39200]" />
            Locaciones de Eventos
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configuración geográfica y perímetros GPS para habilitar Cachengueoo Match.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3.5 py-2 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#F39200]/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar locación</span>
        </button>
      </div>

      {/* Toast de confirmación */}
      {showSavedToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastText}</span>
        </div>
      )}

      {/* Lista de locaciones agregadas (estilo tarjetas de eventos) */}
      {locations.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121217] border border-dashed border-zinc-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-[#F39200]">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">No hay locaciones configuradas</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Hacé click en <strong>"Agregar locación"</strong> para fijar la primera sede en Google Maps con su nombre y radio de cobertura.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-[#F39200] text-black font-extrabold text-xs cursor-pointer hover:bg-[#E08400] transition-colors shadow-md shadow-[#F39200]/20"
          >
            + Agregar locación de evento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc, idx) => (
            <div
              key={loc.id}
              className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-[#F39200]">
                      #{idx + 1}
                    </span>
                    <h4 className="text-base font-bold text-white font-display truncate">
                      {loc.name}
                    </h4>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Activo GPS
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#F39200] shrink-0" />
                    <span className="truncate">{loc.address || 'Ubicación seleccionada en el mapa'}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="font-mono text-[#F39200] font-bold bg-[#F39200]/10 px-2 py-0.5 rounded-md border border-[#F39200]/20">
                      Rango: {loc.radiusMeters} metros
                    </span>
                    <span className="font-mono text-zinc-500 text-[10px]">
                      Coordenadas: ({loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)})
                    </span>
                  </div>
                </div>

                {/* Acciones simétricas: Editar y Eliminar */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(loc)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#F39200] text-zinc-300 hover:text-white cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-bold"
                    title="Editar locación"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationToDelete(loc)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                    title="Eliminar locación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* POPUP MODAL: AGREGAR / EDITAR LOCACIÓN (SIMILAR A AGREGAR EVENTO) */}
      {/* ============================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  Configuración Geográfica
                </span>
                <h4 className="text-base font-bold text-white font-display mt-0.5">
                  {editingLocationId ? 'Modificar Locación de Evento' : 'Agregar Locación de Evento'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario completo */}
            <form onSubmit={handleSaveLocation} className="space-y-4 text-xs">
              {/* 1. Buscador de dirección integrado */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold block flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[#F39200]" />
                  Buscar dirección o punto de referencia
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchAddress(e);
                        }
                      }}
                      placeholder="Ej. Arena Maipú, Emilio Civit 100, Mendoza..."
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-[#F39200] text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={isSearching}
                    className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isSearching ? 'Buscando...' : 'Buscar'}</span>
                  </button>
                </div>
                {searchFeedback && (
                  <p className="text-[11px] text-[#F39200] pt-0.5">{searchFeedback}</p>
                )}
              </div>

              {/* 2. Mapa interactivo Google Maps (limpio, sin carto ni satélite) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1 text-zinc-300 font-medium">
                    <Crosshair className="w-3.5 h-3.5 text-[#F39200]" />
                    Tocá o arrastrá el pin en Google Maps para ajustar la posición
                  </span>
                  <span className="text-[#F39200] font-mono font-bold">
                    Radio: {formRadius}m
                  </span>
                </div>

                <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-zinc-800 bg-[#18181b]">
                  <div
                    ref={mapContainerRef}
                    className="w-full h-full z-0"
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>
              </div>

              {/* 3. Nombre de la locación o evento */}
              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold block">
                  Nombre de la locación o evento *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Cachengueoo Sede Central, Arena Maipú..."
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200] text-xs"
                />
              </div>

              {/* 4. Dirección / Punto de referencia */}
              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold block">
                  Dirección visible o referencia
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Ej. Emilio Civit y Maza, Maipú, Mendoza"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200] text-xs"
                />
              </div>

              {/* 5. Rango / Radio del evento en metros con slider y campo numérico */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#F39200]" />
                    Rango del evento (Radio en metros)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="30"
                      max="3000"
                      step="10"
                      value={formRadius}
                      onChange={(e) => setFormRadius(parseInt(e.target.value) || 50)}
                      className="w-20 h-8 px-2 text-right rounded-lg bg-zinc-900 border border-zinc-700 text-[#F39200] font-black font-mono text-sm focus:outline-none focus:border-[#F39200]"
                    />
                    <span className="text-zinc-400 font-mono text-xs">metros</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="10"
                  value={formRadius}
                  onChange={(e) => setFormRadius(parseInt(e.target.value) || 50)}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#F39200]"
                />

                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>50m (Boliche chico)</span>
                  <span className="text-[#F39200] font-bold">
                    Cobertura GPS: {formRadius} metros
                  </span>
                  <span>2000m (Predio masivo)</span>
                </div>
              </div>

              {/* Coordenadas en formato badge */}
              <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500 font-mono">
                <span>Lat: {formLat.toFixed(6)}</span>
                <span>Lon: {formLng.toFixed(6)}</span>
              </div>

              {/* Botón principal de guardado */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim()}
                  className="flex-1 h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-black text-xs cursor-pointer transition-all shadow-lg shadow-[#F39200]/25 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {editingLocationId ? 'Guardar cambios de locación' : 'Agregar locación de evento'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE LOCACIÓN (MODELO DE SEGURIDAD)  */}
      {/* ============================================================== */}
      {locationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-red-500/40 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl shadow-red-950/40">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                Zona de Peligro
              </span>
              <h4 className="text-base font-black text-white font-display">
                ¿Eliminar {locationToDelete.name}?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Esta acción eliminará de forma permanente esta sede de la validación GPS y de la base de datos.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
              <p className="font-semibold text-white">{locationToDelete.name}</p>
              <p className="text-zinc-400 text-[10px]">
                {locationToDelete.address || 'Ubicación en el mapa'} · Radio {locationToDelete.radiusMeters}m
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setLocationToDelete(null)}
                className="flex-1 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteLocation}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-red-950/60 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
