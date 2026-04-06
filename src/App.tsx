import React, { useState, useMemo, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { 
  Inbox, 
  Map as MapIcon, 
  Search, 
  Clock, 
  MapPin, 
  AlertCircle, 
  IndianRupee, 
  Music,
  CheckCircle2,
  ShieldCheck,
  Video,
  FileText,
  BarChart3,
  MoreVertical,
  ArrowUpDown,
  Star,
  ExternalLink,
  Shield,
  Fingerprint,
  Activity,
  Globe,
  Smartphone,
  Zap,
  Columns,
  ArrowRight,
  Gavel,
  Phone,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { format } from 'date-fns';
import { cn } from '@/src/lib/utils';
import { MOCK_CASES, Case, CaseStage } from './types';

// Custom Heatmap Layer for Leaflet
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    // @ts-ignore
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
    }).addTo(map);
    
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);
  
  return null;
}

// Fix for Leaflet marker icons
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

type FilterType = 'time' | 'location' | 'offences' | 'fine' | 'label' | 'quality';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cases' | 'map' | 'progress' | 'agent' | 'litigation'>('cases');
  const [allCases, setAllCases] = useState<Case[]>(MOCK_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(MOCK_CASES[0].id);
  const [sortBy, setSortBy] = useState<FilterType>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [invalidMoveId, setInvalidMoveId] = useState<string | null>(null);
  
  // Advanced Intelligence State
  const [mapMode, setMapMode] = useState<'hotspots' | 'revenue'>('hotspots');
  const [isLiveMode, setIsLiveMode] = useState(false);

  const filteredCases = allCases;

  const selectedCase = useMemo(() => 
    filteredCases.find(c => c.id === selectedCaseId) || filteredCases[0] || allCases[0], 
    [selectedCaseId, filteredCases, allCases]
  );

  const updateCaseStage = (id: string, newStage: CaseStage, notes?: string, assignmentType?: 'Agent' | 'Lawyer', agentResolutionNote?: string, resolvedByAgentName?: string) => {
    const agents = ['Agent Smith', 'Agent Johnson', 'Agent Williams', 'Agent Brown'];
    const lawyers = ['Lawyer Davis', 'Lawyer Miller', 'Lawyer Wilson', 'Lawyer Moore'];
    
    setAllCases(prev => prev.map(c => {
      if (c.id === id) {
        const assignedTo = assignmentType === 'Agent' 
          ? agents[Math.floor(Math.random() * agents.length)]
          : assignmentType === 'Lawyer'
            ? lawyers[Math.floor(Math.random() * lawyers.length)]
            : c.assignedTo;
            
        return { 
          ...c, 
          stage: newStage, 
          notes: notes || c.notes,
          assignedTo,
          assignmentType: assignmentType || c.assignmentType,
          agentResolutionNote: agentResolutionNote || c.agentResolutionNote,
          resolvedByAgentName: resolvedByAgentName || c.resolvedByAgentName
        };
      }
      return c;
    }));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const caseId = active.id as string;
    const stages: CaseStage[] = ['New', 'Under Review', 'Agent Assignment', 'Ready For Legal', 'Recovery In Progress', 'Closed'];
    
    let newStage: CaseStage | null = null;
    
    // Resolve target stage
    if (stages.includes(over.id as CaseStage)) {
      newStage = over.id as CaseStage;
    } else {
      const overCase = allCases.find(c => c.id === over.id);
      if (overCase) {
        newStage = overCase.stage;
      }
    }

    if (!newStage) return;
    
    const caseToMove = allCases.find(c => c.id === caseId);
    if (!caseToMove) return;

    const currentIdx = stages.indexOf(caseToMove.stage);
    const newIdx = stages.indexOf(newStage);

    // Constraints:
    // 1. Cannot move to 'New'
    // 2. Cannot move forward (newIdx > currentIdx)
    // 3. Can only move backward (newIdx < currentIdx)
    if (newStage !== 'New' && newIdx < currentIdx) {
      updateCaseStage(caseId, newStage);
    } else if (newStage !== caseToMove.stage) {
      // Invalid move animation trigger
      setInvalidMoveId(caseId);
      setTimeout(() => setInvalidMoveId(null), 500);
    }
  };

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    const c = allCases.find(caseItem => caseItem.id === id);
    if (c && c.stage === 'New') {
      setAllCases(prev => prev.map(item => item.id === id ? { ...item, stage: 'Under Review', isNew: false } : item));
    } else if (c && c.isNew) {
      setAllCases(prev => prev.map(item => item.id === id ? { ...item, isNew: false } : item));
    }
  };

  const sortedCases = useMemo(() => {
    return [...filteredCases].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'time':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'location':
          comparison = a.location.city.localeCompare(b.location.city);
          break;
        case 'offences':
          comparison = a.pastOffences - b.pastOffences;
          break;
        case 'fine':
          comparison = a.expectedFine - b.expectedFine;
          break;
        case 'label':
          comparison = a.musicLabel.localeCompare(b.musicLabel);
          break;
        case 'quality':
          comparison = a.qualityScore - b.qualityScore;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [sortBy, sortOrder, filteredCases]);

  useEffect(() => {
    // Mark initial case as read on load
    if (selectedCaseId) {
      const c = allCases.find(item => item.id === selectedCaseId);
      if (c && (c.isNew || c.stage === 'New')) {
        handleSelectCase(selectedCaseId);
      }
    }
  }, []);

  const toggleSort = (type: FilterType) => {
    if (sortBy === type) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Shield className="text-white w-5 h-5" />
          </div>
          <span className="hidden md:block font-bold text-lg tracking-tight text-white">SonicGuard</span>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          <div className="pb-2 px-3">
            <p className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-slate-500">Main</p>
          </div>
          <button 
            onClick={() => setActiveTab('cases')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
              activeTab === 'cases' ? "bg-blue-900/30 text-blue-400 font-bold shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <Inbox className="w-4 h-4" />
            <span className="hidden md:block text-sm">Cases</span>
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
              activeTab === 'map' ? "bg-blue-900/30 text-blue-400 font-bold shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <MapIcon className="w-4 h-4" />
            <span className="hidden md:block text-sm">Map Intelligence</span>
          </button>
          <button 
            onClick={() => setActiveTab('progress')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
              activeTab === 'progress' ? "bg-blue-900/30 text-blue-400 font-bold shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <Columns className="w-4 h-4" />
            <span className="hidden md:block text-sm">Progress</span>
          </button>

          <button 
            onClick={() => setActiveTab('agent')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
              activeTab === 'agent' ? "bg-blue-900/30 text-blue-400 font-bold shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden md:block text-sm">Agent Window</span>
          </button>

          <button 
            onClick={() => setActiveTab('litigation')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
              activeTab === 'litigation' ? "bg-blue-900/30 text-blue-400 font-bold shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <Gavel className="w-4 h-4" />
            <span className="hidden md:block text-sm">Litigation Window</span>
          </button>

          <div className="pt-6 pb-2 px-3">
            <p className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-slate-500">Management</p>
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:block text-sm">Reports</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">JD</div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">John Doe</p>
              <p className="text-[10px] text-slate-500 truncate">Enforcement Officer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'cases' ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Inbox List */}
            <div className="w-full md:w-80 lg:w-[400px] border-r border-slate-800 flex flex-col bg-slate-950">
              <div className="p-5 border-b border-slate-800 space-y-4 bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Global Cases
                    </h2>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setIsLiveMode(!isLiveMode)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        isLiveMode ? "bg-red-600 text-white animate-pulse" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      )}
                    >
                      <Zap className={cn("w-3 h-3", isLiveMode ? "fill-current" : "")} />
                      {isLiveMode ? 'Live' : 'Go Live'}
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search cases, venues, ISRC..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
                
                {/* Filters/Sort Bar */}
                <div className="flex flex-wrap gap-1.5">
                  <FilterButton 
                    active={sortBy === 'time'} 
                    onClick={() => toggleSort('time')}
                    icon={<Clock className="w-3 h-3" />}
                    label="Time"
                    order={sortBy === 'time' ? sortOrder : null}
                  />
                  <FilterButton 
                    active={sortBy === 'location'} 
                    onClick={() => toggleSort('location')}
                    icon={<MapPin className="w-3 h-3" />}
                    label="Location"
                    order={sortBy === 'location' ? sortOrder : null}
                  />
                  <FilterButton 
                    active={sortBy === 'offences'} 
                    onClick={() => toggleSort('offences')}
                    icon={<AlertCircle className="w-3 h-3" />}
                    label="Offences"
                    order={sortBy === 'offences' ? sortOrder : null}
                  />
                  <FilterButton 
                    active={sortBy === 'fine'} 
                    onClick={() => toggleSort('fine')}
                    icon={<IndianRupee className="w-3 h-3" />}
                    label="Fine"
                    order={sortBy === 'fine' ? sortOrder : null}
                  />
                  <FilterButton 
                    active={sortBy === 'label'} 
                    onClick={() => toggleSort('label')}
                    icon={<Music className="w-3 h-3" />}
                    label="Label"
                    order={sortBy === 'label' ? sortOrder : null}
                  />
                  <FilterButton 
                    active={sortBy === 'quality'} 
                    onClick={() => toggleSort('quality')}
                    icon={<Star className="w-3 h-3" />}
                    label="Quality"
                    order={sortBy === 'quality' ? sortOrder : null}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {sortedCases.map((c) => (
                  <CaseListItem 
                    key={c.id} 
                    caseData={c} 
                    isSelected={selectedCaseId === c.id}
                    onClick={() => handleSelectCase(c.id)}
                  />
                ))}
              </div>
            </div>

            {/* Case Detail */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-8 lg:p-12">
              <CaseDetailView 
                caseData={selectedCase} 
                onUpdateStage={updateCaseStage}
              />
            </div>
          </div>
        ) : activeTab === 'map' ? (
          <div className="flex-1 relative">
            <div className="absolute top-6 left-6 z-[1000] bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl w-80">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Map Intelligence
                </h3>
                <div className="flex bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setMapMode('hotspots')}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                      mapMode === 'hotspots' ? "bg-slate-700 text-blue-400 shadow-sm" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Hotspots
                  </button>
                  <button 
                    onClick={() => setMapMode('revenue')}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                      mapMode === 'revenue' ? "bg-slate-700 text-blue-400 shadow-sm" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Revenue
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Detection</span>
                    <button 
                      onClick={() => setIsLiveMode(!isLiveMode)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all",
                        isLiveMode ? "bg-blue-600" : "bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        isLiveMode ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Heatmap Intensity</span>
                    <span className="text-[10px] font-black text-white">HIGH</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                   <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <p className="text-[11px] font-bold text-slate-200">
                        {isLiveMode ? 'Monitoring live streams...' : 'Static analysis mode'}
                      </p>
                   </div>
                   <p className="text-[10px] text-slate-400 leading-relaxed">
                     {mapMode === 'hotspots' 
                        ? 'Visualizing individual infringement events with real-time trust verification.' 
                        : 'Aggregating unrecovered licensing revenue density across urban centers.'}
                   </p>
                </div>
              </div>
            </div>

            <MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={true} className="z-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              {mapMode === 'revenue' && (
                <HeatmapLayer 
                  points={allCases.map(c => [c.location.lat, c.location.lng, c.recoverableValue / 10000])} 
                />
              )}

              {mapMode === 'hotspots' && allCases.map((c) => (
                <React.Fragment key={c.id}>
                  <CircleMarker 
                    center={[c.location.lat, c.location.lng]}
                    radius={isLiveMode && c.isNew ? 30 : 20}
                    pathOptions={{ 
                      fillColor: 
                        c.stage === 'New' ? '#3b82f6' : 
                        c.stage === 'Under Review' ? '#f59e0b' :
                        c.stage === 'Agent Assignment' ? '#06b6d4' :
                        c.stage === 'Ready For Legal' ? '#10b981' :
                        c.stage === 'Recovery In Progress' ? '#a855f7' : '#64748b', 
                      fillOpacity: isLiveMode && c.isNew ? 0.3 : 0.15, 
                      color: 'transparent' 
                    }}
                    className={cn(isLiveMode && c.isNew ? "animate-pulse-live" : "")}
                  />
                  <Marker position={[c.location.lat, c.location.lng]}>
                    <Popup className="custom-popup">
                      <div className="p-5 min-w-[280px]">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{c.id}</span>
                            <span className="text-[9px] text-slate-400 font-bold">{format(c.timestamp, 'HH:mm')}</span>
                          </div>
                          <span className={cn(
                            "px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest",
                            c.stage === 'New' ? "bg-blue-900/40 text-blue-400" : 
                            c.stage === 'Under Review' ? "bg-amber-900/40 text-amber-400" :
                            c.stage === 'Agent Assignment' ? "bg-cyan-900/40 text-cyan-400" :
                            c.stage === 'Ready For Legal' ? "bg-emerald-900/40 text-emerald-400" :
                            c.stage === 'Recovery In Progress' ? "bg-purple-900/40 text-purple-400" :
                            "bg-slate-900/40 text-slate-400"
                          )}>{c.stage}</span>
                        </div>
                        <h4 className="font-black text-white text-base mb-1 tracking-tight">{c.location.name}</h4>
                        <p className="text-xs text-slate-400 font-bold mb-5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {c.location.city}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-6 py-4 border-y border-slate-800">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Potential</p>
                            <p className="text-sm font-black text-white">₹{c.recoverableValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Quality</p>
                            <p className="text-sm font-black text-white">{c.qualityScore}%</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            handleSelectCase(c.id);
                            setActiveTab('cases');
                          }}
                          className="w-full mt-5 py-3 bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
                        >
                          Access Evidence Vault
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        ) : activeTab === 'progress' ? (
          <KanbanBoard 
            cases={allCases} 
            onSelectCase={(id) => {
              handleSelectCase(id);
              setActiveTab('cases');
            }}
            onDragEnd={onDragEnd}
            invalidMoveId={invalidMoveId}
          />
        ) : activeTab === 'agent' ? (
          <AgentDashboard 
            cases={allCases.filter(c => c.assignmentType === 'Agent')} 
            onSelectCase={handleSelectCase}
            onUpdateStage={updateCaseStage}
            setActiveTab={setActiveTab}
          />
        ) : (
          <LitigationDashboard 
            cases={allCases.filter(c => c.assignmentType === 'Lawyer')} 
            onSelectCase={handleSelectCase}
            onUpdateStage={updateCaseStage}
            setActiveTab={setActiveTab}
          />
        )}
      </main>
    </div>
  );
}

function FilterButton({ active, onClick, icon, label, order }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, order: 'asc' | 'desc' | null }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all border",
        active 
          ? "bg-blue-900/30 text-blue-400 border-blue-800" 
          : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
      )}
    >
      {icon}
      {label}
      {active && (
        <ArrowUpDown className={cn("w-3 h-3 transition-transform", order === 'asc' ? "rotate-180" : "")} />
      )}
    </button>
  );
}

function CaseListItem({ caseData, isSelected, onClick }: { caseData: Case, isSelected: boolean, onClick: () => void, key?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 border-b border-slate-800 transition-all relative group",
        isSelected ? "bg-blue-900/20 border-l-4 border-l-blue-600" : "hover:bg-slate-900 border-l-4 border-l-transparent"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest">{caseData.id}</span>
        <span className="text-[10px] text-slate-500 font-bold">{format(caseData.timestamp, 'HH:mm')}</span>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <h3 className={cn("font-black text-sm truncate flex-1 tracking-tight", isSelected ? "text-white" : "text-slate-200")}>
          {caseData.location.name}
        </h3>
        {caseData.isNew && (
          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase tracking-widest animate-pulse">NEW</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold mb-4">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-500" />
          {caseData.location.city}
        </div>
        <div className="flex items-center gap-1">
          <Music className="w-3 h-3 text-slate-500" />
          {caseData.musicLabel}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-white font-black text-xs">
          <IndianRupee className="w-3 h-3 text-slate-500" />
          {caseData.expectedFine.toLocaleString()}
        </div>
        <div className={cn(
          "px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
          caseData.stage === 'New' ? "bg-blue-900/40 text-blue-400 border border-blue-800" : 
          caseData.stage === 'Under Review' ? "bg-amber-900/40 text-amber-400 border border-amber-800" : 
          caseData.stage === 'Agent Assignment' ? "bg-cyan-900/40 text-cyan-400 border border-cyan-800" :
          caseData.stage === 'Ready For Legal' ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800" :
          caseData.stage === 'Recovery In Progress' ? "bg-purple-900/40 text-purple-400 border border-purple-800" :
          "bg-slate-900/40 text-slate-400 border border-slate-800"
        )}>
          {caseData.stage}
        </div>
      </div>
    </button>
  );
}

function CaseDetailView({ caseData, onUpdateStage }: { caseData: Case, onUpdateStage: (id: string, stage: CaseStage, notes?: string, type?: 'Agent' | 'Lawyer') => void }) {
  const [modalType, setModalType] = useState<'Agent' | 'Lawyer' | null>(null);

  const handleConfirm = (notes: string) => {
    if (modalType === 'Agent') {
      onUpdateStage(caseData.id, 'Agent Assignment', notes, 'Agent');
    } else if (modalType === 'Lawyer') {
      onUpdateStage(caseData.id, 'Ready For Legal', notes, 'Lawyer');
    }
    setModalType(null);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={caseData.id}
        className="max-w-6xl mx-auto space-y-10"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 pb-10 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-blue-400 text-[11px] font-black tracking-[0.2em] uppercase">{caseData.id}</span>
              <span className="h-1 w-1 rounded-full bg-slate-600"></span>
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">{format(caseData.timestamp, 'MMMM dd, yyyy HH:mm')}</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-3">{caseData.location.name}</h1>
            <div className="flex items-center gap-5">
              <p className="text-slate-400 text-sm flex items-center gap-2 font-bold">
                <MapPin className="w-4 h-4 text-slate-500" />
                {caseData.location.city}, India
              </p>
              <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border",
                caseData.stage === 'New' ? "bg-blue-900/30 text-blue-400 border-blue-800" : 
                caseData.stage === 'Under Review' ? "bg-amber-900/30 text-amber-400 border-amber-800" : 
                caseData.stage === 'Agent Assignment' ? "bg-cyan-900/30 text-cyan-400 border-cyan-800" :
                caseData.stage === 'Ready For Legal' ? "bg-emerald-900/30 text-emerald-400 border-emerald-800" :
                caseData.stage === 'Recovery In Progress' ? "bg-purple-900/30 text-purple-400 border-purple-800" :
                "bg-slate-900/30 text-slate-400 border-slate-800"
              )}>
                {caseData.stage}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-w-[160px] shadow-sm">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Quality Score</p>
               <div className="text-3xl font-black text-white">{caseData.qualityScore}<span className="text-sm text-slate-600 font-bold">/100</span></div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-w-[160px] shadow-sm">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Recovery Value</p>
               <div className="text-3xl font-black text-blue-400">₹{(caseData.recoverableValue / 1000).toFixed(0)}k</div>
            </div>
          </div>
        </div>

        {/* Video Proof Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative group">
            <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl px-4 py-2 rounded-xl border border-slate-800 shadow-xl">
              <Video className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] font-black text-white uppercase tracking-widest">Video Evidence Vault</span>
            </div>
            <video 
              src={caseData.videoProofUrl} 
              className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              autoPlay 
              muted 
              loop 
            />
            <div className="absolute bottom-6 right-6 z-10">
               <button className="p-3 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-800 shadow-xl hover:bg-slate-800 transition-all transform hover:scale-105">
                  <ExternalLink className="w-5 h-5 text-white" />
               </button>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-900/20 flex items-center justify-center border border-blue-900/30">
                <FileText className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="font-black text-white uppercase tracking-widest text-[11px]">AI Forensic Assessment</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed flex-1 font-medium">
              {caseData.aiExplanation}
            </p>
            <div className="mt-10 pt-8 border-t border-slate-800">
               <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confidence Index</span>
                  <span className="text-sm font-black text-blue-400">98.2%</span>
               </div>
               <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div className="h-full bg-blue-600 w-[98.2%] shadow-sm shadow-blue-600/50" />
               </div>
            </div>
          </div>
        </section>

        {/* Trust Gates Section */}
        <section className="bg-slate-900 rounded-3xl p-10 border border-slate-800 shadow-sm">
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Integrity & Trust Verification Gates</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
            <TrustGate label="Media Hash Key" active={caseData.trustGates.mediaHashKey} icon={<Fingerprint className="w-6 h-6" />} />
            <TrustGate label="Payload Signature" active={caseData.trustGates.payloadSignature} icon={<ShieldCheck className="w-6 h-6" />} />
            <TrustGate label="Clock Skew" active={caseData.trustGates.clockSkewDetection} icon={<Activity className="w-6 h-6" />} />
            <TrustGate label="Geofencing" active={caseData.trustGates.geofencingContinuity} icon={<Globe className="w-6 h-6" />} />
            <TrustGate label="Device Trust" active={caseData.trustGates.deviceTrustBand} icon={<Smartphone className="w-6 h-6" />} />
          </div>
        </section>

        {/* Chain of Custody Section */}
        <section className="bg-slate-950 rounded-3xl p-10 border border-slate-800 shadow-2xl text-white">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Chain of Custody Log (Immutable)</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Hash Verified</span>
            </div>
          </div>
          <div className="space-y-6">
            {caseData.chainOfCustody.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-6 group">
                <div className="flex flex-col items-center gap-2 pt-1">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2",
                    entry.status === 'Verified' ? "bg-emerald-500 border-emerald-400" : "bg-amber-500 border-amber-400"
                  )} />
                  {idx !== caseData.chainOfCustody.length - 1 && <div className="w-0.5 h-12 bg-slate-800" />}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b border-slate-800 group-last:border-0">
                  <div className="col-span-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Timestamp</p>
                    <p className="text-xs font-mono text-slate-300">{format(new Date(entry.timestamp), 'HH:mm:ss.SSS')}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Event / Actor</p>
                    <p className="text-xs font-bold text-white">{entry.event}</p>
                    <p className="text-[10px] text-slate-400">{entry.actor}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Device / Node ID</p>
                    <p className="text-xs font-mono text-slate-300">{entry.deviceId}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">SHA-256 Hash</p>
                    <p className="text-[10px] font-mono text-slate-500 truncate">{entry.hash}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Song Assessment Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-slate-900 rounded-3xl p-10 border border-slate-800 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Song Forensic Assessment</h3>
            <div className="space-y-10">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Title & Artist</p>
                <h4 className="text-2xl font-black text-white mb-1 tracking-tight">{caseData.songAssessment.title}</h4>
                <p className="text-blue-400 text-base font-black">{caseData.songAssessment.artists.join(', ')}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                <InfoItem label="Label Owner" value={caseData.songAssessment.labelOwner} />
                <InfoItem label="Association" value={caseData.songAssessment.rightsAssociation} />
                <InfoItem label="ISRC" value={caseData.songAssessment.isrc} />
                <InfoItem label="UPC" value={caseData.songAssessment.upc} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-10 border border-slate-800 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Absolute Proof (Physical Context)</h3>
            <div className="flex gap-8 mb-10">
              <div className="w-40 aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex-shrink-0 shadow-lg">
                 <video src={caseData.absoluteProof.smallVideoUrl} autoPlay muted loop className="w-full h-full object-cover" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Performance Context</p>
                 <p className="text-sm text-slate-300 leading-relaxed font-bold">{caseData.absoluteProof.performanceContext}</p>
              </div>
            </div>
            
            <div className="space-y-10">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-5">Venue Identifying Signals</p>
                <div className="flex gap-4">
                  {caseData.absoluteProof.venueImages.map((img, i) => (
                    <img key={i} src={img} className="w-20 h-20 rounded-2xl object-cover border border-slate-800 shadow-sm hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                  ))}
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-all cursor-pointer">
                    <MoreVertical className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Obstruction Flags</p>
                <p className="text-sm text-slate-400 font-bold">{caseData.absoluteProof.obstructionFlags}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Actions Section */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t border-slate-800">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-3 h-3 rounded-full shadow-sm",
              caseData.stage === 'New' ? "bg-blue-600" : 
              caseData.stage === 'Under Review' ? "bg-amber-600" :
              caseData.stage === 'Agent Assignment' ? "bg-cyan-600" :
              caseData.stage === 'Ready For Legal' ? "bg-emerald-600" :
              caseData.stage === 'Recovery In Progress' ? "bg-purple-600" : "bg-slate-600"
            )} />
            <p className="text-sm font-black text-white uppercase tracking-[0.2em]">
              Case Status: {caseData.stage}
            </p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => setModalType('Agent')}
              className="flex-1 md:flex-none px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800 shadow-sm hover:shadow-md active:scale-95"
            >
              Request More Proof
            </button>
            <button 
              onClick={() => setModalType('Lawyer')}
              className="flex-1 md:flex-none px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              Initiate Recovery
            </button>
          </div>
        </section>
      </motion.div>

      <AnimatePresence>
        {modalType && (
          <VerificationModal 
            isOpen={!!modalType} 
            onClose={() => setModalType(null)} 
            onConfirm={handleConfirm} 
            caseData={caseData} 
            type={modalType} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

function VerificationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  caseData, 
  type 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: (notes: string) => void, 
  caseData: Case, 
  type: 'Agent' | 'Lawyer' 
}) {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              type === 'Agent' ? "bg-cyan-900/20 text-cyan-400" : "bg-emerald-900/20 text-emerald-400"
            )}>
              {type === 'Agent' ? <Smartphone className="w-5 h-5" /> : <Gavel className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">
                {type === 'Agent' ? 'Request Additional Proof' : 'Initiate Legal Recovery'}
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Case Verification Summary</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
            <Inbox className="w-5 h-5 rotate-45" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SummaryItem 
              label="Trust Verification" 
              value="5/5 Gates Verified" 
              icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} 
            />
            <SummaryItem 
              label="Chain of Custody" 
              value={`${caseData.chainOfCustody.length} Immutable Logs`} 
              icon={<Shield className="w-4 h-4 text-blue-400" />} 
            />
            <SummaryItem 
              label="Forensic Assessment" 
              value={`${caseData.qualityScore}% Match Confidence`} 
              icon={<Fingerprint className="w-4 h-4 text-purple-400" />} 
            />
            <SummaryItem 
              label="Physical Context" 
              value={caseData.absoluteProof.performanceContext.split(',')[0]} 
              icon={<Video className="w-4 h-4 text-amber-400" />} 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assignment Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={type === 'Agent' ? "Specify what exactly is missing in the proof..." : "Add legal instructions for the litigation team..."}
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-widest rounded-2xl transition-all border border-slate-800"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(notes)}
            className={cn(
              "flex-1 py-4 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg",
              type === 'Agent' ? "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            {type === 'Agent' ? 'Assign to Agent' : 'Send to Litigation'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SummaryItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-4 bg-slate-950/30 rounded-2xl border border-slate-800/30 flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function TrustGate({ label, active, icon }: { label: string, active: boolean, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2",
        active ? "bg-blue-900/30 border-blue-800 text-blue-400 shadow-sm" : "bg-slate-800 border-slate-700 text-slate-600"
      )}>
        {icon}
      </div>
      <div className="space-y-1.5">
        <span className={cn("text-[10px] font-black uppercase tracking-widest block", active ? "text-white" : "text-slate-500")}>{label}</span>
        {active ? (
          <div className="flex items-center justify-center gap-1">
             <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
             <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Verified</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
             <Clock className="w-2.5 h-2.5 text-slate-600" />
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Pending</span>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ cases, onSelectCase, onDragEnd, invalidMoveId }: { cases: Case[], onSelectCase: (id: string) => void, onDragEnd: (event: DragEndEvent) => void, invalidMoveId: string | null }) {
  const columns: CaseStage[] = ['New', 'Under Review', 'Agent Assignment', 'Ready For Legal', 'Recovery In Progress', 'Closed'];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    onDragEnd(event);
  };

  const activeCase = cases.find(c => c.id === activeId);
  
  const isInvalidHover = useMemo(() => {
    if (!activeCase || !overId) return false;
    
    const stages: CaseStage[] = ['New', 'Under Review', 'Agent Assignment', 'Ready For Legal', 'Recovery In Progress', 'Closed'];
    let targetStage: CaseStage | null = null;
    
    if (stages.includes(overId as CaseStage)) {
      targetStage = overId as CaseStage;
    } else {
      const overCase = cases.find(c => c.id === overId);
      if (overCase) targetStage = overCase.stage;
    }
    
    if (!targetStage) return false;
    
    const currentIdx = stages.indexOf(activeCase.stage);
    const targetIdx = stages.indexOf(targetStage);
    
    return targetStage === 'New' || targetIdx > currentIdx;
  }, [activeCase, overId, cases]);

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto bg-slate-950 p-8">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map(column => (
            <KanbanColumn 
              key={column} 
              id={column} 
              title={column} 
              cases={cases.filter(c => c.stage === column)} 
              onSelectCase={onSelectCase}
              invalidMoveId={invalidMoveId}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeId && activeCase ? (
          <div className={cn(
            "w-80 opacity-80 rotate-3 pointer-events-none transition-all duration-200 relative",
            isInvalidHover ? "scale-90 grayscale" : ""
          )}>
            {isInvalidHover && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-500/20 rounded-xl border-2 border-red-500/50 backdrop-blur-[2px]">
                <AlertCircle className="w-12 h-12 text-red-500 mb-2 drop-shadow-lg" />
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-slate-950/80 px-2 py-1 rounded">Restricted Move</span>
              </div>
            )}
            <KanbanCard caseData={activeCase} onSelectCase={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  id: string;
  title: string;
  cases: Case[];
  onSelectCase: (id: string) => void;
  key?: string;
}

function KanbanColumn({ id, title, cases, onSelectCase, invalidMoveId }: KanbanColumnProps & { invalidMoveId: string | null }) {
  const { setNodeRef } = useSortable({
    id: id,
    data: {
      type: 'Column',
    },
  });

  return (
    <div ref={setNodeRef} className="w-80 flex flex-col bg-slate-900/30 rounded-2xl border border-slate-800/50">
      <div className="p-5 border-b border-slate-800/50 flex items-center justify-between">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
        <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full">
          {cases.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <SortableContext items={cases.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cases.map(c => (
            <KanbanCard key={c.id} caseData={c} onSelectCase={onSelectCase} isInvalid={invalidMoveId === c.id} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface KanbanCardProps {
  caseData: Case;
  onSelectCase: (id: string) => void;
  key?: string;
  isInvalid?: boolean;
}

function KanbanCard({ caseData, onSelectCase, isInvalid }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: caseData.id,
    data: {
      type: 'Case',
      case: caseData
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      animate={isInvalid ? { 
        x: [-8, 8, -8, 8, 0],
        borderColor: ['#1e293b', '#ef4444', '#ef4444', '#ef4444', '#1e293b']
      } : {}}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelectCase(caseData.id)}
      className={cn(
        "w-full text-left bg-slate-900 border p-5 rounded-xl shadow-sm transition-all group cursor-grab active:cursor-grabbing",
        isInvalid ? "border-red-500/50 shadow-lg shadow-red-500/10" : "border-slate-800 hover:border-blue-500/50"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-[9px] font-black text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest">{caseData.id}</span>
        <ArrowRight className="w-3 h-3 text-slate-700 group-hover:text-blue-400 transition-colors" />
      </div>
      <h4 className="text-sm font-black text-white mb-2 tracking-tight line-clamp-1">{caseData.location.name}</h4>
      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mb-4">
        <MapPin className="w-3 h-3" />
        {caseData.location.city}
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
        <div className="flex items-center gap-1 text-white font-black text-[11px]">
          <IndianRupee className="w-3 h-3 text-slate-500" />
          {caseData.expectedFine.toLocaleString()}
        </div>
        <div className="text-[10px] font-black text-blue-400">{caseData.qualityScore}%</div>
      </div>
    </motion.div>
  );
}

function AgentDashboard({ cases, onSelectCase, onUpdateStage, setActiveTab }: { cases: Case[], onSelectCase: (id: string) => void, onUpdateStage: (id: string, stage: CaseStage, notes?: string, type?: 'Agent' | 'Lawyer', resNote?: string, resAgentName?: string) => void, setActiveTab: (tab: string) => void }) {
  const [resolvingCase, setResolvingCase] = useState<Case | null>(null);

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-y-auto">
      <div className="p-10 border-b border-slate-800 bg-slate-900/20">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-black text-white tracking-tight">Agent Window</h2>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">Field Operations</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium">Cases assigned for field verification and additional proof collection.</p>
      </div>
      
      <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cases.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600">
            <Inbox className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-bold">No cases currently assigned to agents</p>
          </div>
        ) : (
          cases.map(c => (
            <AssignmentCard 
              key={c.id} 
              caseData={c} 
              onSelectCase={onSelectCase}
              onUpdateStage={onUpdateStage}
              setActiveTab={setActiveTab}
              onOpenResolvedModal={() => setResolvingCase(c)}
            />
          ))
        )}
      </div>

      <AnimatePresence>
        {resolvingCase && (
          <ResolutionModal 
            caseData={resolvingCase}
            onClose={() => setResolvingCase(null)}
            onConfirm={(resNote) => {
              onUpdateStage(resolvingCase.id, 'Ready For Legal', undefined, 'Lawyer', resNote, resolvingCase.assignedTo);
              setResolvingCase(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResolutionModal({ caseData, onClose, onConfirm }: { caseData: Case, onClose: () => void, onConfirm: (note: string) => void }) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-2xl font-black text-white tracking-tight mb-2">Resolve Case</h3>
          <p className="text-slate-500 text-sm font-medium">Add your field findings before sending to Litigation.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resolution Findings</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the proof collected or the resolution details..."
              className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-widest rounded-2xl transition-all border border-slate-800"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(note)}
            disabled={!note.trim()}
            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-600/20"
          >
            Confirm & Send
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LitigationDashboard({ cases, onSelectCase, onUpdateStage, setActiveTab }: { cases: Case[], onSelectCase: (id: string) => void, onUpdateStage: (id: string, stage: CaseStage, notes?: string, type?: 'Agent' | 'Lawyer', resNote?: string, resAgentName?: string) => void, setActiveTab: (tab: string) => void }) {
  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-y-auto">
      <div className="p-10 border-b border-slate-800 bg-slate-900/20">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-black text-white tracking-tight">Litigation Window</h2>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <Gavel className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Legal Recovery</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium">Cases ready for legal action and formal recovery proceedings.</p>
      </div>
      
      <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cases.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600">
            <Inbox className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-bold">No cases currently assigned to litigation</p>
          </div>
        ) : (
          cases.map(c => (
            <AssignmentCard 
              key={c.id} 
              caseData={c} 
              onSelectCase={onSelectCase}
              onUpdateStage={onUpdateStage}
              setActiveTab={setActiveTab}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AssignmentCard({ caseData, onSelectCase, onUpdateStage, setActiveTab, onOpenResolvedModal }: { caseData: Case, key?: string, onSelectCase?: (id: string) => void, onUpdateStage?: (id: string, stage: CaseStage, notes?: string, type?: 'Agent' | 'Lawyer', resNote?: string, resAgentName?: string) => void, setActiveTab?: (tab: string) => void, onOpenResolvedModal?: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-sm hover:border-blue-500/30 transition-all group"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{caseData.id}</span>
          <h4 className="text-lg font-black text-white tracking-tight mb-2">{caseData.location.name}</h4>
          
          <div className="flex gap-4">
             <div className="group/tooltip relative">
                <MapPin className="w-4 h-4 text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50 w-48 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl text-[10px] font-bold text-slate-200 leading-relaxed">
                   <p className="text-blue-400 uppercase tracking-widest mb-1 text-[8px]">Venue Address</p>
                   {caseData.location.address}
                </div>
             </div>
             <div className="group/tooltip relative">
                <Phone className="w-4 h-4 text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50 w-40 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl text-[10px] font-bold text-slate-200">
                   <p className="text-blue-400 uppercase tracking-widest mb-1 text-[8px]">Contact Number</p>
                   {caseData.location.phone}
                </div>
             </div>
             <div className="group/tooltip relative">
                <Mail className="w-4 h-4 text-slate-500 hover:text-blue-400 cursor-help transition-colors" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50 w-48 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl text-[10px] font-bold text-slate-200">
                   <p className="text-blue-400 uppercase tracking-widest mb-1 text-[8px]">Email Address</p>
                   {caseData.location.email}
                </div>
             </div>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
          {caseData.assignmentType === 'Agent' ? <Smartphone className="w-5 h-5 text-cyan-400" /> : <Gavel className="w-5 h-5 text-emerald-400" />}
        </div>
      </div>

      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Logged At</p>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-xs font-bold text-white">{format(caseData.timestamp, 'HH:mm')}</p>
            </div>
          </div>
          <div className="p-4 bg-emerald-900/10 rounded-2xl border border-emerald-900/20">
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Recovery</p>
            <div className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-xs font-black text-white">₹{(caseData.recoverableValue / 1000).toFixed(0)}k</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Assigned To</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
              {caseData.assignedTo?.split(' ')[1][0]}
            </div>
            <p className="text-sm font-bold text-white">{caseData.assignedTo}</p>
          </div>
        </div>

        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Forensic Summary</p>
          <div className="grid grid-cols-2 gap-3">
             <div className="p-3 bg-slate-950/30 rounded-xl border border-slate-800/30 flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-600 uppercase">Trust Gates</span>
                <span className="text-[10px] font-bold text-emerald-500">5/5 Verified</span>
             </div>
             <div className="p-3 bg-slate-950/30 rounded-xl border border-slate-800/30 flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-600 uppercase">Quality</span>
                <span className="text-[10px] font-bold text-blue-400">{caseData.qualityScore}%</span>
             </div>
          </div>
        </div>

        {caseData.notes && (
          <div className="p-4 bg-blue-900/10 rounded-2xl border border-blue-900/20">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Assignment Notes</p>
            <p className="text-xs text-slate-300 leading-relaxed italic">"{caseData.notes}"</p>
          </div>
        )}

        {caseData.assignmentType === 'Lawyer' && caseData.agentResolutionNote && (
          <div className="p-4 bg-emerald-900/10 rounded-2xl border border-emerald-900/20">
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Agent Resolution Findings</p>
            <p className="text-xs text-slate-300 leading-relaxed italic mb-2">"{caseData.agentResolutionNote}"</p>
            <div className="flex items-center gap-2 pt-2 border-t border-emerald-900/20">
              <div className="w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center text-[8px] font-black text-white">
                {caseData.resolvedByAgentName?.split(' ')[1][0] || 'A'}
              </div>
              <span className="text-[10px] font-bold text-slate-400">Verified by {caseData.resolvedByAgentName || 'Field Agent'}</span>
            </div>
          </div>
        )}
      </div>

      {caseData.assignmentType === 'Agent' ? (
        <div className="flex gap-3">
          <button 
            onClick={() => {
              onSelectCase?.(caseData.id);
              setActiveTab?.('cases');
            }}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all border border-slate-700 shadow-sm active:scale-95"
          >
            Edit
          </button>
          <button 
            onClick={() => onUpdateStage?.(caseData.id, 'Ready For Legal', undefined, 'Lawyer')}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all border border-slate-700 shadow-sm active:scale-95"
          >
            No Change
          </button>
          <button 
            onClick={onOpenResolvedModal}
            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            Resolved
          </button>
        </div>
      ) : (
        <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all border border-slate-700 shadow-sm active:scale-95">
          View Full Evidence File
        </button>
      )}
    </motion.div>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm font-black text-white tracking-tight">{value}</p>
    </div>
  );
}
