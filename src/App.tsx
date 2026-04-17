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
  Plus,
  Navigation,
  Columns,
  ArrowRight,
  Gavel,
  Phone,
  Mail,
  MessageSquare,
  Send,
  Link,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { format } from 'date-fns';
import { cn } from '@/src/lib/utils';
import { MOCK_CASES, Case, CaseStage, UserRole, AuditEntry, Comment as CaseComment, EvidenceVault } from './types';

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
  const [activeTab, setActiveTab] = useState<'cases' | 'map' | 'progress' | 'agent' | 'litigation' | 'reports'>('cases');
  const [allCases, setAllCases] = useState<Case[]>(MOCK_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(MOCK_CASES[0].id);
  const [sortBy, setSortBy] = useState<FilterType>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [userRole, setUserRole] = useState<UserRole>('Admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [listTab, setListTab] = useState<'upcoming' | 'active' | 'closed'>('active');
  
  const [invalidMoveId, setInvalidMoveId] = useState<string | null>(null);
  
  // Advanced Intelligence State
  const [mapMode, setMapMode] = useState<'hotspots' | 'revenue'>('hotspots');
  const [isLiveMode, setIsLiveMode] = useState(false);

  const filteredCases = useMemo(() => {
    let base = allCases;
    
    // Role-based filtering: Agents ONLY see assigned cases, period.
    if (userRole === 'Agent') {
      return base.filter(c => c.stage === 'Agent Assignment');
    }

    // Filter by tab for other roles
    if (listTab === 'upcoming') {
      base = base.filter(c => c.stage === 'New');
    } else if (listTab === 'active') {
      base = base.filter(c => ['Under Review', 'Agent Assignment', 'Ready For Legal', 'Recovery In Progress'].includes(c.stage));
    } else if (listTab === 'closed') {
      base = base.filter(c => c.stage === 'Closed');
    }

    if (!searchQuery) return base;
    const query = searchQuery.toLowerCase();
    return base.filter(c => 
      c.id.toLowerCase().includes(query) ||
      c.location.name.toLowerCase().includes(query) ||
      c.location.city.toLowerCase().includes(query) ||
      c.songAssessment.title.toLowerCase().includes(query) ||
      c.songAssessment.isrc.toLowerCase().includes(query) ||
      c.musicLabel.toLowerCase().includes(query)
    );
  }, [allCases, searchQuery, listTab, userRole]);

  const selectedCase = useMemo(() => {
    const found = filteredCases.find(c => c.id === selectedCaseId);
    if (found) return found;
    if (filteredCases.length > 0) return filteredCases[0];
    return null; // No fallback to allCases[0] if it's not in filtered list
  }, [selectedCaseId, filteredCases]);

  const updateCaseStage = (id: string, newStage: CaseStage, notes?: string, assignmentType?: 'Agent' | 'Lawyer', agentResolutionNote?: string, resolvedByAgentName?: string, selectedVaultIds?: string[]) => {
    const agents = ['Agent Smith', 'Agent Johnson', 'Agent Williams', 'Agent Brown'];
    const lawyers = ['Lawyer Davis', 'Lawyer Miller', 'Lawyer Wilson', 'Lawyer Moore'];
    
    setAllCases(prev => prev.map(c => {
      if (c.id === id) {
        const assignedTo = assignmentType === 'Agent' 
          ? agents[Math.floor(Math.random() * agents.length)]
          : assignmentType === 'Lawyer'
            ? lawyers[Math.floor(Math.random() * lawyers.length)]
            : c.assignedTo;
            
        const auditEntry: AuditEntry = {
          id: `AUD-${Date.now()}`,
          timestamp: new Date(),
          action: c.stage === newStage ? "Action Logged" : "Stage Updated",
          actor: userRole,
          previousStage: c.stage,
          newStage: newStage,
          details: notes || "No additional notes provided."
        };

        return { 
          ...c, 
          stage: newStage, 
          notes: notes || c.notes,
          assignedTo,
          assignmentType: assignmentType || c.assignmentType,
          agentResolutionNote: agentResolutionNote || c.agentResolutionNote,
          resolvedByAgentName: resolvedByAgentName || c.resolvedByAgentName,
          selectedVaultIds: selectedVaultIds || c.selectedVaultIds,
          auditTrail: [...c.auditTrail, auditEntry],
          unreadMajorChanges: true
        };
      }
      return c;
    }));
  };

  const addComment = (id: string, text: string) => {
    setAllCases(prev => prev.map(c => {
      if (c.id === id) {
        const newComment: CaseComment = {
          id: `COM-${Date.now()}`,
          timestamp: new Date(),
          author: userRole === 'Admin' ? 'Admin User' : userRole === 'Lawyer' ? 'Legal Counsel' : 'Field Agent',
          text,
          role: userRole
        };
        return {
          ...c,
          comments: [...c.comments, newComment],
          unreadComments: true
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
    setAllCases(prev => prev.map(item => {
      if (item.id === id) {
        let updates: Partial<Case> = { unreadComments: false, unreadMajorChanges: false };
        if (item.isNew) {
          updates = { ...updates, isNew: false };
        }
        return { ...item, ...updates };
      }
      return item;
    }));
  };

  const clearNotification = (id: string, type: 'major' | 'comments') => {
    setAllCases(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          unreadComments: type === 'comments' ? false : c.unreadComments,
          unreadMajorChanges: type === 'major' ? false : c.unreadMajorChanges
        };
      }
      return c;
    }));
  };

  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'major' | 'info' }[]>([]);

  const addNotification = (message: string, type: 'major' | 'info' = 'info') => {
    const id = `NOTIF-${Date.now()}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const createEvidenceVault = (caseId: string) => {
    setAllCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const vaultNumber = (c.evidenceVaults?.length || 0) + 1;
        const newVault: EvidenceVault = {
          id: `VAULT-${Date.now()}`,
          name: `Evidence Vault ${vaultNumber}`,
          timestamp: new Date(),
          images: [],
          notes: `Additional evidence vault created by agent.`
        };

        const auditEntry: AuditEntry = {
          id: `AUD-${Date.now()}`,
          timestamp: new Date(),
          action: "Evidence Vault Created",
          actor: userRole,
          details: `New evidence vault initiated: ${newVault.name}`
        };

        const comment: CaseComment = {
          id: `COM-${Date.now()}`,
          timestamp: new Date(),
          author: "Field Agent",
          text: `🚨 MAJOR: ${newVault.name} has been initiated for this case.`,
          role: 'Agent'
        };

        addNotification(`New Evidence Vault created for ${c.id}`, 'major');

        return {
          ...c,
          evidenceVaults: [...(c.evidenceVaults || []), newVault],
          auditTrail: [...c.auditTrail, auditEntry],
          comments: [...c.comments, comment],
          unreadMajorChanges: true
        };
      }
      return c;
    }));
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

  useEffect(() => {
    if (userRole === 'Agent') {
      setListTab('active');
    }
  }, [userRole]);

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
      {/* Major Notifications Overlay */}
      <div className="fixed top-10 right-10 z-[200] space-y-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map(notif => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={cn(
                "p-6 rounded-[24px] border shadow-2xl backdrop-blur-xl pointer-events-auto min-w-[320px]",
                notif.type === 'major' 
                  ? "bg-brand-indigo/10 border-brand-indigo/30 text-brand-indigo shadow-brand-indigo/20" 
                  : "bg-white/5 border-white/10 text-text-primary shadow-black/40"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  notif.type === 'major' ? "bg-brand-indigo text-white" : "bg-white/10 text-text-tertiary"
                )}>
                  {notif.type === 'major' ? <Zap className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">
                    {notif.type === 'major' ? 'Major Update' : 'Notification'}
                  </p>
                  <p className="text-sm font-bold tracking-tight">{notif.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
              "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-label",
              activeTab === 'cases' ? "bg-white/5 text-text-primary shadow-sm" : "text-text-tertiary hover:bg-white/[0.02] hover:text-text-secondary"
            )}
          >
            <Inbox className="w-4 h-4" />
            <span className="hidden md:block">Cases</span>
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-label",
              activeTab === 'map' ? "bg-white/5 text-text-primary shadow-sm" : "text-text-tertiary hover:bg-white/[0.02] hover:text-text-secondary"
            )}
          >
            <MapIcon className="w-4 h-4" />
            <span className="hidden md:block">Map Intelligence</span>
          </button>
          
          {userRole === 'Admin' && (
            <button 
              onClick={() => setActiveTab('progress')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-label",
                activeTab === 'progress' ? "bg-white/5 text-text-primary shadow-sm" : "text-text-tertiary hover:bg-white/[0.02] hover:text-text-secondary"
              )}
            >
              <Columns className="w-4 h-4" />
              <span className="hidden md:block">Progress</span>
            </button>
          )}

          {(userRole === 'Admin' || userRole === 'Agent') && (
            <button 
              onClick={() => setActiveTab('agent')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-label",
                activeTab === 'agent' ? "bg-white/5 text-text-primary shadow-sm" : "text-text-tertiary hover:bg-white/[0.02] hover:text-text-secondary"
              )}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:block">Agent Window</span>
            </button>
          )}

          {(userRole === 'Admin' || userRole === 'Lawyer') && (
            <button 
              onClick={() => setActiveTab('litigation')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-label",
                activeTab === 'litigation' ? "bg-white/5 text-text-primary shadow-sm" : "text-text-tertiary hover:bg-white/[0.02] hover:text-text-secondary"
              )}
            >
              <Gavel className="w-4 h-4" />
              <span className="hidden md:block">Litigation Window</span>
            </button>
          )}

          {userRole === 'Admin' && (
            <>
              <div className="pt-6 pb-2 px-3">
                <p className="hidden md:block text-tiny uppercase tracking-widest text-text-quaternary">Management</p>
              </div>
              <button 
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-label",
                  activeTab === 'reports' ? "bg-white/5 text-text-primary shadow-sm" : "text-text-tertiary hover:bg-white/[0.02] hover:text-text-secondary"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden md:block">Reports</span>
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex flex-col gap-2 px-2">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Switch Role (Demo)</p>
            <div className="flex gap-1">
              {(['Admin', 'Lawyer', 'Agent'] as UserRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  className={cn(
                    "flex-1 py-1 text-[8px] font-black rounded border transition-all",
                    userRole === role ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  {role[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              {userRole === 'Admin' ? 'AD' : userRole === 'Lawyer' ? 'LC' : 'FA'}
            </div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {userRole === 'Admin' ? 'Admin User' : userRole === 'Lawyer' ? 'Legal Counsel' : 'Field Agent'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'cases' ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Inbox List */}
            <div className="w-full md:w-80 lg:w-[400px] border-r border-border-subtle flex flex-col bg-bg-panel">
              <div className="p-5 border-b border-border-subtle space-y-4 bg-white/[0.01]">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-h3 text-text-primary">
                      Global Cases
                    </h2>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setIsLiveMode(!isLiveMode)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-tiny font-black uppercase tracking-widest transition-all",
                        isLiveMode ? "bg-red-600 text-white animate-pulse" : "bg-white/5 text-text-tertiary hover:bg-white/10"
                      )}
                    >
                      <Zap className={cn("w-3 h-3", isLiveMode ? "fill-current" : "")} />
                      {isLiveMode ? 'Live' : 'Go Live'}
                    </button>
                  </div>
                </div>
                
                {userRole !== 'Agent' && (
                  <div className="flex gap-1 bg-white/[0.02] p-1 rounded-lg border border-border-standard">
                    {(['upcoming', 'active', 'closed'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setListTab(tab)}
                        className={cn(
                          "flex-1 py-1.5 text-tiny font-black uppercase tracking-widest rounded-md transition-all",
                          listTab === tab ? "bg-white/10 text-text-primary shadow-sm" : "text-text-quaternary hover:text-text-secondary"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
                <input 
                  type="text" 
                  placeholder="Search cases, venues, ISRC..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-transparent border border-border-standard rounded-md text-caption text-text-primary focus:border-accent-violet transition-all outline-none placeholder:text-text-quaternary"
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
            <div className="flex-1 overflow-y-auto bg-bg-marketing p-8 lg:p-12">
              {selectedCase ? (
                <CaseDetailView 
                  caseData={selectedCase} 
                  onUpdateStage={updateCaseStage}
                  addComment={addComment}
                  userRole={userRole}
                  clearNotification={clearNotification}
                  onCreateVault={createEvidenceVault}
                  setActiveTab={setActiveTab}
                  setListTab={setListTab}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-quaternary">
                  <Inbox className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-label uppercase tracking-widest opacity-20">No Case Selected</p>
                </div>
              )}
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
            cases={allCases.filter(c => c.stage === 'Agent Assignment')} 
            onSelectCase={handleSelectCase}
            onUpdateStage={updateCaseStage}
            setActiveTab={setActiveTab}
            addComment={addComment}
            onCreateVault={createEvidenceVault}
          />
        ) : activeTab === 'reports' ? (
          <ReportsDashboard allCases={allCases} />
        ) : activeTab === 'litigation' ? (
          <LitigationDashboard 
            allCases={allCases} 
            onSelectCase={handleSelectCase}
            onUpdateStage={updateCaseStage}
            setActiveTab={setActiveTab}
            onAddComment={addComment}
            addNotification={addNotification}
          />
        ) : null}
      </main>
    </div>
  );
}

function ReportsDashboard({ allCases }: { allCases: Case[] }) {
  const stats = useMemo(() => {
    const totalValue = allCases.reduce((sum, c) => sum + c.recoverableValue, 0);
    const recoveredValue = allCases.filter(c => c.stage === 'Closed').reduce((sum, c) => sum + c.recoverableValue, 0);
    const pendingValue = totalValue - recoveredValue;
    const successRate = (allCases.filter(c => c.stage === 'Closed').length / allCases.length) * 100;
    
    const labelDistribution = allCases.reduce((acc, c) => {
      acc[c.musicLabel] = (acc[c.musicLabel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const cityDistribution = allCases.reduce((acc, c) => {
      acc[c.location.city] = (acc[c.location.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalValue, recoveredValue, pendingValue, successRate, labelDistribution, cityDistribution };
  }, [allCases]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-3">Management Intelligence</h2>
            <h1 className="text-4xl font-black text-white tracking-tight">Executive Analytics</h1>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
              Export CSV
            </button>
            <button className="px-6 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
              Generate PDF Report
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Pipeline Value" value={`₹${(stats.totalValue / 100000).toFixed(1)}L`} icon={<IndianRupee className="w-5 h-5 text-blue-400" />} />
          <StatCard label="Recovered Revenue" value={`₹${(stats.recoveredValue / 100000).toFixed(1)}L`} icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />} />
          <StatCard label="Pending Recovery" value={`₹${(stats.pendingValue / 100000).toFixed(1)}L`} icon={<Clock className="w-5 h-5 text-amber-400" />} />
          <StatCard label="Success Rate" value={`${stats.successRate.toFixed(1)}%`} icon={<Activity className="w-5 h-5 text-purple-400" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Label Distribution</h3>
            <div className="space-y-6">
              {Object.entries(stats.labelDistribution).map(([label, count]) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-white">{count} Cases</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${(Number(count) / allCases.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Geographic Density</h3>
            <div className="space-y-6">
              {Object.entries(stats.cityDistribution).map(([city, count]) => (
                <div key={city} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">{city}</span>
                    <span className="text-white">{count} Cases</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${(Number(count) / allCases.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] rounded-xl p-8 border border-border-standard shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center border border-border-subtle">
          {icon}
        </div>
        <span className="text-tiny font-black text-text-tertiary uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-h2 text-text-primary">{value}</div>
    </div>
  );
}

function FilterButton({ active, onClick, icon, label, order }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, order: 'asc' | 'desc' | null }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-tiny font-semibold transition-all border",
        active 
          ? "bg-white/10 text-text-primary border-white/20" 
          : "bg-white/[0.02] text-text-tertiary border-border-standard hover:border-border-subtle hover:bg-white/[0.04]"
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
        "w-full text-left p-5 border-b border-border-subtle transition-all relative group",
        isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
      )}
    >
      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent-violet" />}
      {caseData.unreadMajorChanges && (
        <span className="w-2.5 h-2.5 bg-red-500 rounded-full absolute top-5 right-2 shadow-lg shadow-red-500/50 animate-pulse border-2 border-bg-panel z-10" />
      )}
      {caseData.unreadComments && !caseData.unreadMajorChanges && (
        <span className="w-2 h-2 bg-accent-violet rounded-full absolute top-5 right-2 shadow-lg shadow-accent-violet/50 border border-bg-panel z-10" />
      )}
      <div className="flex justify-between items-start mb-2">
        <span className="text-tiny font-black text-text-quaternary group-hover:text-accent-violet transition-colors uppercase tracking-widest">{caseData.id}</span>
        <span className="text-tiny text-text-quaternary font-bold">{format(caseData.timestamp, 'HH:mm')}</span>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <h3 className={cn("text-caption font-semibold truncate flex-1 tracking-tight", isSelected ? "text-text-primary" : "text-text-secondary")}>
          {caseData.location.name}
        </h3>
        {caseData.isNew && (
          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase tracking-widest animate-pulse">NEW</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-tiny text-text-tertiary font-bold mb-4">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-text-quaternary" />
          {caseData.location.city}
        </div>
        <div className="flex items-center gap-1">
          <Music className="w-3 h-3 text-text-quaternary" />
          {caseData.musicLabel}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-text-primary font-black text-caption">
          <IndianRupee className="w-3 h-3 text-text-quaternary" />
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

function CaseDetailView({ 
  caseData, 
  onUpdateStage, 
  addComment, 
  userRole,
  clearNotification,
  onCreateVault,
  setActiveTab,
  setListTab
}: { 
  caseData: Case, 
  onUpdateStage: (id: string, stage: CaseStage, notes?: string, type?: 'Agent' | 'Lawyer', resNote?: string, resAgentName?: string, selectedVaultIds?: string[]) => void,
  addComment: (id: string, text: string) => void,
  userRole: UserRole,
  clearNotification: (id: string, type: 'comments' | 'major') => void,
  onCreateVault: (id: string) => void,
  setActiveTab: (tab: string) => void,
  setListTab: (tab: 'upcoming' | 'active' | 'closed') => void
}) {
  const [modalType, setModalType] = useState<'Agent' | 'Lawyer' | null>(null);
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState<string>('evidence-0');
  const [activeVaultIndex, setActiveVaultIndex] = useState(0);

  const handleTabChange = (tab: string) => {
    setActiveDetailTab(tab);
    if (tab === 'audit') clearNotification(caseData.id, 'major');
    if (tab === 'comments') clearNotification(caseData.id, 'comments');
    if (tab.startsWith('evidence-')) {
      setActiveVaultIndex(parseInt(tab.split('-')[1]));
    }
  };

  const handleConfirm = (notes: string, selectedVaultIds?: string[]) => {
    if (modalType === 'Agent') {
      onUpdateStage(caseData.id, 'Agent Assignment', notes, 'Agent');
    } else if (modalType === 'Lawyer') {
      onUpdateStage(caseData.id, 'Ready For Legal', notes, 'Lawyer', undefined, undefined, selectedVaultIds);
    }
    setModalType(null);
  };

  const handleDoneConfirm = (notes: string) => {
    onUpdateStage(caseData.id, caseData.stage, notes); // Just add to audit trail
    setIsDoneModalOpen(false);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(caseData.id, commentText);
    setCommentText('');
  };

  const exportPDF = () => {
    console.log("Generating Forensic Evidence PDF... (Mock Export)");
    // In a real app, this would use a library like jspdf or a server-side route
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={caseData.id}
        className="max-w-6xl mx-auto space-y-10"
      >
        {/* Latest Status Audit Insight - Minimal Version (for Agents) */}
        {userRole === 'Agent' && caseData.auditTrail.length > 0 && (
          <div className="p-6 border border-border-standard bg-white/[0.01] rounded-[24px] relative overflow-hidden shadow-sm">
            <div className="flex items-start justify-between gap-10">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 bg-brand-indigo/10 border border-brand-indigo/20 rounded text-[8px] font-black text-brand-indigo uppercase tracking-widest">
                    Latest Assigned Task
                  </div>
                  <span className="text-[8px] font-black text-text-quaternary uppercase tracking-widest opacity-40 italic">
                    Referenced from log: {caseData.auditTrail[caseData.auditTrail.length - 1].action}
                  </span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed font-bold">
                  {caseData.auditTrail[caseData.auditTrail.length - 1].details}
                </p>
              </div>
              <div className="text-right flex flex-col justify-between h-full py-1">
                <div>
                   <p className="text-[8px] font-black text-text-quaternary uppercase tracking-widest opacity-40 mb-1">Last Updated</p>
                   <p className="text-[10px] text-text-secondary font-black">{format(new Date(caseData.auditTrail[caseData.auditTrail.length - 1].timestamp), 'HH:mm:ss')}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                   <p className="text-[8px] font-black text-text-quaternary uppercase tracking-widest opacity-40 mb-1">Authorized Actor</p>
                   <p className="text-[10px] text-brand-indigo font-black uppercase tracking-widest">{caseData.auditTrail[caseData.auditTrail.length - 1].actor}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 pb-12 border-b border-border-subtle">
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-accent-violet/10 border border-accent-violet/20 rounded-full">
                <span className="text-accent-violet text-[10px] font-black tracking-widest uppercase">{caseData.id}</span>
              </div>
              <span className="text-text-quaternary text-caption font-bold tracking-tight">{format(caseData.timestamp, 'MMMM dd, yyyy • HH:mm')}</span>
            </div>
            
            <div>
              <h1 className="text-h1 text-text-primary tracking-tight mb-2 leading-none">{caseData.location.name}</h1>
              <div className="flex items-center gap-4">
                <p className="text-text-tertiary text-sm flex items-center gap-2 font-medium">
                  <MapPin className="w-4 h-4 text-text-quaternary" />
                  {caseData.location.city}, India
                </p>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                  caseData.stage === 'New' ? "bg-white/5 text-text-secondary border-border-standard" : 
                  caseData.stage === 'Under Review' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                  caseData.stage === 'Agent Assignment' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                  caseData.stage === 'Ready For Legal' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  caseData.stage === 'Recovery In Progress' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                  "bg-white/5 text-text-quaternary border-border-standard"
                )}>
                  {caseData.stage}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
              <div className="bg-white/[0.02] border border-border-standard rounded-2xl px-6 py-4 min-w-[140px] shadow-sm flex flex-col justify-center">
                 <p className="text-[9px] font-black text-text-quaternary uppercase tracking-widest mb-1">Quality Score</p>
                 <div className="text-2xl font-black text-text-primary leading-tight">{caseData.qualityScore}<span className="text-xs text-text-quaternary font-bold ml-1">/100</span></div>
              </div>
              <div className="bg-white/[0.02] border border-border-standard rounded-2xl px-6 py-4 min-w-[140px] shadow-sm flex flex-col justify-center">
                 <p className="text-[9px] font-black text-text-quaternary uppercase tracking-widest mb-1">Recovery Value</p>
                 <div className="text-2xl font-black text-accent-violet leading-tight">₹{(caseData.recoverableValue / 1000).toFixed(0)}k</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={exportPDF}
                className="bg-white/[0.02] border border-border-standard rounded-2xl px-6 py-4 flex items-center justify-center gap-3 hover:bg-white/[0.04] transition-all shadow-sm group whitespace-nowrap"
              >
                 <FileText className="w-4 h-4 text-accent-violet group-hover:scale-110 transition-transform" />
                 <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Forensic PDF</span>
              </button>

              {userRole === 'Admin' && caseData.stage === 'New' && (
                <button 
                  onClick={() => {
                    onUpdateStage(caseData.id, 'Under Review', 'Case moved to active review by administrator.');
                    setListTab('active');
                    setActiveTab('cases');
                  }}
                  className="bg-brand-indigo hover:bg-brand-indigo/90 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl px-6 py-4 shadow-xl shadow-brand-indigo/20 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
                >
                  <ArrowRight className="w-4 h-4" />
                  Move to Active
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Song Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 p-8 bg-white/[0.02] rounded-3xl border border-border-standard flex items-center gap-8">
            <div className="w-20 h-20 rounded-2xl bg-brand-indigo/10 flex items-center justify-center border border-brand-indigo/20 shrink-0">
              <Music className="w-10 h-10 text-brand-indigo" />
            </div>
            <div className="flex-1">
              <p className="text-tiny font-black text-text-quaternary uppercase tracking-widest mb-1">Identified Track</p>
              <h2 className="text-2xl font-black text-text-primary mb-1">{caseData.songAssessment.title}</h2>
              <p className="text-sm font-bold text-text-secondary">{caseData.songAssessment.artists.join(', ')} • {caseData.musicLabel}</p>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-x-8 gap-y-2 border-l border-border-subtle pl-8">
              <div>
                <p className="text-[9px] font-black text-text-quaternary uppercase tracking-widest">ISRC</p>
                <p className="text-[11px] font-mono font-bold text-text-primary">{caseData.songAssessment.isrc}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-text-quaternary uppercase tracking-widest">UPC</p>
                <p className="text-[11px] font-mono font-bold text-text-primary">{caseData.songAssessment.upc}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-text-quaternary uppercase tracking-widest">Rights</p>
                <p className="text-[11px] font-bold text-brand-indigo">{caseData.songAssessment.rightsAssociation}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-text-quaternary uppercase tracking-widest">Label</p>
                <p className="text-[11px] font-bold text-text-secondary">{caseData.songAssessment.labelOwner}</p>
              </div>
            </div>
          </div>
          <div className="p-8 bg-white/[0.02] rounded-3xl border border-border-standard flex flex-col justify-center">
            <p className="text-tiny font-black text-text-quaternary uppercase tracking-widest mb-3">Integrity Check</p>
            <div className="space-y-2">
              {Object.entries(caseData.trustGates).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <div className={cn("w-1.5 h-1.5 rounded-full", value ? "bg-emerald-500" : "bg-red-500")} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Tabs */}
        <div className="flex border-b border-slate-800 gap-8 items-center">
          {caseData.evidenceVaults.map((vault, idx) => (
            <button 
              key={vault.id}
              onClick={() => handleTabChange(`evidence-${idx}`)}
              className={cn(
                "pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative",
                activeDetailTab === `evidence-${idx}` ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {vault.name}
              {activeDetailTab === `evidence-${idx}` && <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
          ))}
          
          {userRole === 'Agent' && (
            <button 
              onClick={() => onCreateVault(caseData.id)}
              className="pb-4 text-slate-500 hover:text-blue-400 transition-all flex items-center justify-center"
              title="Add Evidence Vault"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1" />

          <button 
            onClick={() => handleTabChange('audit')}
            className={cn(
              "pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
              activeDetailTab === 'audit' ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Status Audit Trail
            {caseData.unreadMajorChanges && (
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
            )}
            {activeDetailTab === 'audit' && <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>

          <button 
            onClick={() => handleTabChange('custody')}
            className={cn(
              "pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
              activeDetailTab === 'custody' ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Chain of Custody
            {activeDetailTab === 'custody' && <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>
          
          {userRole !== 'Agent' && (
            <button 
              onClick={() => handleTabChange('comments')}
              className={cn(
                "pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
                activeDetailTab === 'comments' ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Internal Threads
              {caseData.unreadComments && (
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50" />
              )}
              {activeDetailTab === 'comments' && <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
          )}
        </div>

        <div className={cn(
          "grid gap-10",
          userRole === 'Agent' ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        )}>
          <div className="space-y-10">
            {activeDetailTab.startsWith('evidence-') ? (
              <>
                {/* Vault Content */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      {caseData.evidenceVaults[activeVaultIndex]?.name} Assets
                    </h3>
                    <span className="text-[10px] text-slate-500 font-bold">
                      Captured {format(caseData.evidenceVaults[activeVaultIndex]?.timestamp || new Date(), 'MMM dd, HH:mm')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-10">
                    <div className="bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative group aspect-video">
                      <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl px-4 py-2 rounded-xl border border-slate-800 shadow-xl">
                        <Video className="w-4 h-4 text-blue-400" />
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Master Forensic Stream</span>
                      </div>
                      <video 
                        src={caseData.evidenceVaults[activeVaultIndex]?.videoUrl || caseData.videoProofUrl} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        autoPlay 
                        muted 
                        loop 
                      />
                    </div>
                    
                    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-blue-900/20 flex items-center justify-center border border-blue-900/30">
                          <FileText className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="font-black text-white uppercase tracking-widest text-[11px]">Vault Notes</h3>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed font-medium">
                        {caseData.evidenceVaults[activeVaultIndex]?.notes || "No additional notes provided for this vault."}
                      </p>
                    </div>
                  </div>

                  {/* Vault Images */}
                  {caseData.evidenceVaults[activeVaultIndex]?.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {caseData.evidenceVaults[activeVaultIndex].images.map((img, i) => (
                        <div key={i} className="aspect-square rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden group">
                          <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Trust Gates (Only show for primary vault or always?) */}
                {activeVaultIndex === 0 && (
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
                )}
              </>
            ) : activeDetailTab === 'custody' ? (
              <section className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Forensic Chain of Custody</h3>
                <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800">
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Event</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Actor</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Device ID</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {caseData.chainOfCustody.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 text-[10px] font-mono text-slate-400">{format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
                          <td className="px-6 py-4 text-[11px] font-bold text-white">{entry.event}</td>
                          <td className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest">{entry.actor}</td>
                          <td className="px-6 py-4 text-[10px] font-mono text-slate-500">{entry.deviceId}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                              entry.status === 'Verified' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                            )}>
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : activeDetailTab === 'audit' ? (
              <section className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Status Audit Trail</h3>
                <div className="space-y-8">
                  {caseData.auditTrail.map((entry) => (
                    <div key={entry.id} className="flex gap-6">
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div className="w-0.5 flex-1 bg-slate-800" />
                      </div>
                      <div className="flex-1 pb-8 border-b border-slate-800 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">{entry.action}</h4>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold">{format(entry.timestamp, 'MMM dd, yyyy HH:mm:ss')}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Actor: {entry.actor}</span>
                          {entry.previousStage && (
                            <>
                              <ArrowRight className="w-3 h-3 text-slate-600" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{entry.previousStage}</span>
                              <ArrowRight className="w-3 h-3 text-slate-600" />
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{entry.newStage}</span>
                            </>
                          )}
                        </div>
                        {entry.action === "Case Created" ? (
                          <div className="flex items-center gap-2 py-2">
                             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">System Initialization</span>
                             <div className="h-px flex-1 bg-slate-800/50" />
                             <span className="text-[9px] text-slate-500 font-bold">{format(entry.timestamp, 'MMM dd, HH:mm')}</span>
                          </div>
                        ) : entry.details && entry.details !== "No additional notes provided" ? (
                          <p className="text-sm text-slate-400 leading-relaxed italic">"{entry.details}"</p>
                        ) : (
                          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">System Log: Standard Entry</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-4">
                  {caseData.comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                      <Inbox className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">No internal comments yet</p>
                    </div>
                  ) : (
                    caseData.comments.map((comment) => (
                      <div key={comment.id} className={cn(
                        "flex flex-col gap-2",
                        comment.role === userRole ? "items-end" : "items-start"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{comment.author}</span>
                          <span className="text-[8px] text-slate-600 font-bold">{format(comment.timestamp, 'HH:mm')}</span>
                        </div>
                        <div className={cn(
                          "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                          comment.role === userRole 
                            ? "bg-brand-indigo text-white rounded-tr-none shadow-lg shadow-brand-indigo/20" 
                            : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none"
                        )}>
                          {comment.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 flex gap-4">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Type your internal message..."
                    className="flex-1 bg-transparent text-sm text-white outline-none"
                  />
                  <button 
                    onClick={handleAddComment}
                    className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    Send
                  </button>
                </div>
              </section>
            )}
          </div>

          {userRole === 'Agent' && (
            <div className="space-y-10">
              <section className="flex flex-col h-[600px] bg-slate-900/50 rounded-[40px] p-10 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Internal Threads</h3>
                  {caseData.unreadComments && (
                    <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black rounded uppercase tracking-widest">New Activity</span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-4 custom-scrollbar">
                  {caseData.comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700">
                      <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-xs font-black uppercase tracking-widest opacity-20">No internal discussion</p>
                    </div>
                  ) : (
                    caseData.comments.map((comment) => (
                      <div key={comment.id} className={cn(
                        "flex flex-col gap-2",
                        comment.role === userRole ? "items-end" : "items-start"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{comment.author}</span>
                          <span className="text-[8px] text-slate-600 font-bold">{format(comment.timestamp, 'HH:mm')}</span>
                        </div>
                        <div className={cn(
                          "max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed",
                          comment.role === userRole 
                            ? "bg-brand-indigo text-white rounded-tr-none shadow-lg shadow-brand-indigo/20" 
                            : "bg-slate-950 text-slate-300 border border-slate-800 rounded-tl-none"
                        )}>
                          {comment.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex gap-3">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Reply to thread..."
                    className="flex-1 bg-transparent text-xs text-white outline-none"
                  />
                  <button 
                    onClick={handleAddComment}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>

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
            {userRole === 'Agent' && (
              <>
                <button 
                  onClick={() => {
                    handleTabChange('evidence');
                    // Scroll to evidence section if needed, or just switch tab
                  }}
                  className="flex-1 md:flex-none px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 shadow-sm active:scale-95"
                >
                  Edit Evidence
                </button>
                <button 
                  onClick={() => setIsDoneModalOpen(true)}
                  className="flex-1 md:flex-none px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5 active:scale-95"
                >
                  Done
                </button>
              </>
            )}
            {userRole === 'Admin' && caseData.stage === 'New' && (
              <div />
            )}
            {userRole === 'Admin' && caseData.stage !== 'New' && (
              <button 
                onClick={() => setModalType('Agent')}
                className="flex-1 md:flex-none px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-border-standard shadow-sm hover:shadow-md active:scale-95"
              >
                Request More Proof
              </button>
            )}
            {userRole !== 'Agent' && (
              <button 
                onClick={() => setModalType('Lawyer')}
                disabled={['New', 'Ready For Legal', 'Recovery In Progress', 'Closed'].includes(caseData.stage)}
                className={cn(
                  "flex-1 md:flex-none px-8 py-4 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl transition-all transform active:scale-95",
                  ['New', 'Ready For Legal', 'Recovery In Progress', 'Closed'].includes(caseData.stage)
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 shadow-none"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 hover:-translate-y-0.5"
                )}
              >
                {['Ready For Legal', 'Recovery In Progress', 'Closed'].includes(caseData.stage) 
                  ? "Sent to Litigation" 
                  : caseData.stage === 'New' 
                    ? "Activate Case to Recover" 
                    : "Initiate Recovery"}
              </button>
            )}
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
        {isDoneModalOpen && (
          <DoneModal 
            isOpen={isDoneModalOpen}
            onClose={() => setIsDoneModalOpen(false)}
            onConfirm={handleDoneConfirm}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function DoneModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: (notes: string) => void 
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
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-800">
          <h3 className="text-xl font-black text-white tracking-tight">Agent Task Completion</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">What was changed?</p>
        </div>
        <div className="p-8">
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe your changes..."
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
          />
        </div>
        <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
          <button 
            onClick={() => { onConfirm(notes); setNotes(''); }}
            className="flex-1 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
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
  onConfirm: (notes: string, selectedVaultIds?: string[]) => void, 
  caseData: Case, 
  type: 'Agent' | 'Lawyer' 
}) {
  const [notes, setNotes] = useState('');
  const [selectedVaults, setSelectedVaults] = useState<string[]>(caseData.evidenceVaults.map(v => v.id));

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

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
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

          {type === 'Lawyer' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Evidence Vaults to Include</label>
              <div className="grid grid-cols-1 gap-3">
                {caseData.evidenceVaults.map(vault => (
                  <button
                    key={vault.id}
                    onClick={() => {
                      setSelectedVaults(prev => 
                        prev.includes(vault.id) 
                          ? prev.filter(id => id !== vault.id)
                          : [...prev, vault.id]
                      );
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                      selectedVaults.includes(vault.id)
                        ? "bg-emerald-600/10 border-emerald-500/50"
                        : "bg-slate-950 border-slate-800 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center border transition-all",
                        selectedVaults.includes(vault.id) ? "bg-emerald-600 border-emerald-600" : "border-slate-700"
                      )}>
                        {selectedVaults.includes(vault.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{vault.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{vault.images.length} Images • {format(vault.timestamp, 'MMM d, HH:mm')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
            onClick={() => onConfirm(notes, type === 'Lawyer' ? selectedVaults : undefined)}
            disabled={type === 'Lawyer' && selectedVaults.length === 0}
            className={cn(
              "flex-1 py-4 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
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

function AgentDashboard({ cases, onSelectCase, onUpdateStage, setActiveTab, addComment, onCreateVault }: { cases: Case[], onSelectCase: (id: string) => void, onUpdateStage: (id: string, stage: CaseStage, notes?: string, type?: 'Agent' | 'Lawyer', resNote?: string, resAgentName?: string, selectedVaultIds?: string[]) => void, setActiveTab: (tab: string) => void, addComment: (id: string, text: string) => void, onCreateVault: (id: string) => void }) {
  const [resolvingCase, setResolvingCase] = useState<Case | null>(null);
  const [selectedAgentCaseId, setSelectedAgentCaseId] = useState<string | null>(cases.length > 0 ? cases[0].id : null);
  const [commentText, setCommentText] = useState('');
  const [rightTab, setRightTab] = useState<'threads' | 'vaults'>('threads');
  const [agentViewMode, setAgentViewMode] = useState<'timeline' | 'pathing'>('timeline');
  const [routeCaseIds, setRouteCaseIds] = useState<string[]>([]);

  const selectedCase = cases.find(c => c.id === selectedAgentCaseId) || cases[0];
  const routeCases = cases.filter(c => routeCaseIds.includes(c.id));

  useEffect(() => {
    if (cases.length > 0 && !selectedAgentCaseId) {
      setSelectedAgentCaseId(cases[0].id);
    }
  }, [cases, selectedAgentCaseId]);

  if (cases.length === 0) {
    return (
      <div className="h-full flex flex-col bg-bg-panel overflow-y-auto">
        <div className="p-10 border-b border-border-subtle bg-white/[0.01]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-h2 text-text-primary tracking-tight uppercase">Case Tracker</h2>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">Case Tracker</span>
            </div>
          </div>
          <p className="text-text-tertiary text-sm font-medium">No cases currently assigned for field verification.</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-600">
          <Inbox className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-bold">No cases currently assigned to agents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-panel overflow-hidden">
      <div className="px-10 py-6 border-b border-border-subtle bg-white/[0.01] flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-text-primary tracking-tight uppercase">Case Tracker</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                <Smartphone className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Case Tracker</span>
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            <button 
              onClick={() => setAgentViewMode('timeline')}
              className={cn(
                "pb-2 text-[10px] font-black uppercase tracking-widest transition-all relative",
                agentViewMode === 'timeline' ? "text-brand-indigo" : "text-text-quaternary hover:text-text-secondary"
              )}
            >
              Timeline
              {agentViewMode === 'timeline' && <motion.div layoutId="agent-mode-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-indigo" />}
            </button>
            <button 
              onClick={() => setAgentViewMode('pathing')}
              className={cn(
                "pb-2 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
                agentViewMode === 'pathing' ? "text-brand-indigo" : "text-text-quaternary hover:text-text-secondary"
              )}
            >
              Pathing
              {routeCaseIds.length > 0 && <span className="w-4 h-4 rounded-full bg-brand-indigo text-white text-[8px] flex items-center justify-center">{routeCaseIds.length}</span>}
              {agentViewMode === 'pathing' && <motion.div layoutId="agent-mode-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-indigo" />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
              {cases.length} Active Assignments
           </p>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Case Sidebar */}
        <div className="w-72 border-r border-border-subtle bg-white/[0.01] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Assigned Cases</h3>
            <Search className="w-3.5 h-3.5 text-text-quaternary" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {cases.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedAgentCaseId(c.id);
                  setAgentViewMode('timeline');
                }}
                className={cn(
                  "w-full p-6 border-b border-border-subtle text-left transition-all relative group",
                  selectedAgentCaseId === c.id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                )}
              >
                {selectedAgentCaseId === c.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-indigo" />}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">{c.id}</span>
                  <span className="text-[9px] text-text-quaternary font-bold">{format(c.timestamp, 'HH:mm')}</span>
                </div>
                <h4 className="text-sm font-black text-text-primary mb-1 truncate">{c.location.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">{c.location.city}</span>
                  <span className="text-[9px] text-text-quaternary">•</span>
                  <span className="text-[9px] font-bold text-emerald-400">₹{(c.recoverableValue / 1000).toFixed(0)}k</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {agentViewMode === 'timeline' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side: Timeline */}
            <div className="flex-1 overflow-y-auto p-10 border-r border-border-subtle">
          {selectedCase && (
            <div className="relative">
              {/* Case Header Milestone */}
              <div className="flex items-start gap-10 mb-12">
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-[24px] bg-brand-indigo flex items-center justify-center shadow-xl shadow-brand-indigo/20 border border-white/10">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-text-quaternary uppercase tracking-widest mb-1 block">{selectedCase.id}</span>
                      <h3 className="text-2xl font-black text-text-primary tracking-tight">{selectedCase.location.name}</h3>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          onSelectCase(selectedCase.id);
                          setActiveTab('cases');
                        }}
                        className="px-6 py-2.5 bg-white/[0.02] border border-border-standard rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-white/[0.04] transition-all"
                      >
                        Open Case File
                      </button>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            if (!routeCaseIds.includes(selectedCase.id)) {
                              setRouteCaseIds([...routeCaseIds, selectedCase.id]);
                            }
                            setAgentViewMode('pathing');
                          }}
                          className="px-6 py-2.5 bg-brand-indigo text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-indigo/20 hover:bg-brand-indigo/90 transition-all flex items-center gap-2"
                        >
                          <Navigation className="w-3 h-3" />
                          Add to Route
                        </button>
                        <button 
                          onClick={() => setResolvingCase(selectedCase)}
                          className="px-6 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/30 transition-all"
                        >
                          Mark as Done
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-bold">{selectedCase.location.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold">{format(selectedCase.timestamp, 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Flow */}
              <div className="ml-8 pl-12 space-y-12 border-l-2 border-dashed border-border-standard/50 pb-20">
                {/* Initial Evidence Milestone */}
                <div className="relative">
                  <div className="absolute -left-[57px] top-0 w-4 h-4 rounded-full bg-bg-panel border-4 border-brand-indigo shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Initial Forensic Capture</p>
                    <div className="flex gap-4">
                      <div className="w-48 aspect-video bg-black rounded-2xl overflow-hidden border border-border-standard shadow-lg relative group">
                        <video src={selectedCase.videoProofUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted loop autoPlay />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                          <span className="text-[8px] font-black text-white uppercase tracking-widest">Master Stream</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {selectedCase.absoluteProof.venueImages.slice(0, 2).map((img, i) => (
                          <div key={i} className="w-24 h-24 rounded-2xl overflow-hidden border border-border-standard shadow-md relative group">
                            <img src={img} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Trail Milestones */}
                {selectedCase.auditTrail.map((entry) => {
                  const isSubtle = !entry.details || entry.details === "No additional notes provided." || entry.action === "Case Created";
                  const isMajor = entry.action === "Evidence Vault Created";
                  
                  return (
                    <div key={entry.id} className="relative">
                      <div className={cn(
                        "absolute -left-[55px] top-1 w-3 h-3 rounded-full",
                        isMajor ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : isSubtle ? "bg-border-standard/30" : "bg-border-standard"
                      )} />
                      
                      {isMajor ? (
                        <div className="p-8 bg-brand-indigo/5 border border-brand-indigo/20 rounded-[32px] max-w-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-indigo/10 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-indigo/20 transition-all" />
                          <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-brand-indigo flex items-center justify-center shadow-lg shadow-brand-indigo/20">
                              <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-text-primary tracking-tight">{entry.action}</h4>
                            </div>
                          </div>
                          
                          {/* Forensic Capture for Evidence Vault Created */}
                          {entry.action === "Evidence Vault Created" && (
                            <div className="mb-6 space-y-3 relative z-10">
                              <p className="text-[10px] font-black text-brand-indigo uppercase tracking-widest">Forensic Capture Display</p>
                              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-brand-indigo/20 shadow-lg relative group">
                                <video src={selectedCase.videoProofUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted loop autoPlay />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                  <span className="text-[8px] font-black text-white uppercase tracking-widest">Master Stream</span>
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-sm text-text-secondary leading-relaxed font-medium mb-4 relative z-10">{entry.details}</p>
                          <div className="flex items-center gap-3 relative z-10">
                            <span className="text-[9px] text-text-quaternary font-bold uppercase tracking-widest">Logged by {entry.actor}</span>
                            <span className="text-[9px] text-text-quaternary/30 font-bold">•</span>
                            <span className="text-[9px] text-text-quaternary font-bold">{format(new Date(entry.timestamp), 'HH:mm:ss')}</span>
                          </div>
                        </div>
                      ) : isSubtle ? (
                        <div className="flex items-center gap-3 py-1">
                          <span className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">{entry.action}</span>
                          <span className="text-[10px] text-text-quaternary/50 font-bold">•</span>
                          <span className="text-[10px] text-text-quaternary/50 font-bold uppercase tracking-widest">{entry.actor}</span>
                          <span className="text-[9px] text-text-quaternary/30 font-bold ml-auto">{format(new Date(entry.timestamp), 'HH:mm:ss')}</span>
                        </div>
                      ) : (
                        <div className="p-6 bg-white/[0.01] border border-border-standard rounded-[24px] max-w-2xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-brand-indigo uppercase tracking-widest">{entry.action}</span>
                              <span className="text-[10px] text-text-quaternary font-bold">•</span>
                              <span className="text-[10px] text-text-quaternary font-bold uppercase tracking-widest">{entry.actor}</span>
                            </div>
                            <span className="text-[9px] text-text-quaternary font-bold">{format(new Date(entry.timestamp), 'HH:mm:ss')}</span>
                          </div>
                          <p className="text-sm text-text-secondary leading-relaxed italic">"{entry.details}"</p>
                          {entry.newStage && entry.newStage !== entry.previousStage && (
                            <div className="mt-4 flex items-center gap-2">
                              <span className="text-[8px] font-black text-text-quaternary uppercase tracking-widest">Stage Transition:</span>
                              <span className="px-2 py-0.5 bg-white/5 border border-border-standard rounded text-[8px] font-black text-emerald-400 uppercase tracking-widest">{entry.newStage}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Current Status Milestone */}
                <div className="relative">
                  <div className="absolute -left-[57px] top-0 w-4 h-4 rounded-full bg-border-standard shadow-sm" />
                  <div className="pl-2">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Current Status: {selectedCase.stage}</span>
                    </div>
                    {selectedCase.auditTrail.length > 0 && (
                      <p className="text-xs text-text-tertiary font-medium">{selectedCase.auditTrail[selectedCase.auditTrail.length - 1].details}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Internal Threads & Vaults */}
        <div className="w-96 flex flex-col bg-bg-panel border-l border-border-subtle">
          {/* Latest Status Audit Insight - Minimal Version */}
          {selectedCase.auditTrail.length > 0 && (
            <div className="p-6 border-b border-border-subtle bg-white/[0.01]">
              <div className="p-5 border border-border-standard bg-white/[0.01] rounded-[24px] relative overflow-hidden shadow-sm">
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-black text-text-quaternary uppercase tracking-widest mb-0.5 block opacity-40">Latest Assigned Task</span>
                      <h4 className="text-xs font-black text-text-primary tracking-tight">{selectedCase.auditTrail[selectedCase.auditTrail.length - 1].action}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-brand-indigo uppercase tracking-widest opacity-60">Status Active</p>
                      <p className="text-[9px] text-text-quaternary font-bold">{format(new Date(selectedCase.auditTrail[selectedCase.auditTrail.length - 1].timestamp), 'HH:mm:ss')}</p>
                    </div>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed font-medium">
                    {selectedCase.auditTrail[selectedCase.auditTrail.length - 1].details}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-black text-text-quaternary uppercase tracking-widest opacity-30">Authorized By</span>
                       <span className="text-[9px] font-black text-text-quaternary uppercase tracking-widest">{selectedCase.auditTrail[selectedCase.auditTrail.length - 1].actor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-white/[0.01]">
            <div className="p-1 bg-white/[0.03] border border-border-standard rounded-2xl flex gap-1 flex-1">
                <button 
                  onClick={() => setRightTab('threads')}
                  className={cn(
                    "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl",
                    rightTab === 'threads' ? "bg-white/[0.08] text-text-primary shadow-sm" : "text-text-quaternary hover:text-text-secondary"
                  )}
                >
                  Threads
                </button>
                <button 
                  onClick={() => setRightTab('vaults')}
                  className={cn(
                    "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl",
                    rightTab === 'vaults' ? "bg-white/[0.08] text-text-primary shadow-sm" : "text-text-quaternary hover:text-text-secondary"
                  )}
                >
                  Vaults
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0 h-full flex flex-col">
            <div className="px-6 pb-6 space-y-8 flex-1 flex flex-col min-h-0 pt-6">
              <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 custom-scrollbar">
                {rightTab === 'threads' ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3 h-3 text-text-quaternary" />
                      <h4 className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Internal Threads</h4>
                    </div>
                  {selectedCase?.comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-quaternary opacity-50 py-20">
                      <MessageSquare className="w-12 h-12 mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest">No internal messages</p>
                    </div>
                  ) : (
                    selectedCase?.comments.map(comment => (
                      <div key={comment.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            comment.role === 'Admin' ? "text-blue-400" : comment.role === 'Lawyer' ? "text-purple-400" : "text-emerald-400"
                          )}>
                            {comment.author}
                          </span>
                          <span className="text-[9px] text-text-quaternary font-bold">{format(comment.timestamp, 'HH:mm')}</span>
                        </div>
                        <div className="p-4 bg-white/[0.02] border border-border-standard rounded-2xl">
                          <p className="text-xs text-text-secondary leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
            ) : (
              <div className="space-y-6">
                {selectedCase?.evidenceVaults?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-quaternary opacity-50 py-20">
                    <Shield className="w-12 h-12 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">No evidence vaults</p>
                  </div>
                ) : (
                  selectedCase?.evidenceVaults?.map(vault => (
                    <div key={vault.id} className="p-6 bg-white/[0.02] border border-border-standard rounded-[32px] space-y-6 group hover:border-brand-indigo/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-text-primary uppercase tracking-widest">{vault.name}</h4>
                            <span className="text-[8px] font-bold text-text-quaternary uppercase tracking-widest">Secure Ledger Point</span>
                          </div>
                        </div>
                        <span className="text-[9px] text-text-quaternary font-bold">{format(vault.timestamp, 'MMM d, HH:mm')}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {vault.images.slice(0, 4).map((img, i) => (
                          <div key={i} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/5 overflow-hidden relative group/img">
                            <img src={img} className="w-full h-full object-cover grayscale opacity-50 group-hover/img:grayscale-0 group-hover/img:opacity-100 transition-all duration-500" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                          </div>
                        ))}
                        {vault.images.length === 0 && (
                          <div className="col-span-2 py-10 flex flex-col items-center justify-center bg-white/[0.01] border border-dashed border-border-standard rounded-[24px]">
                            <Video className="w-8 h-8 text-text-quaternary mb-3 opacity-20" />
                            <p className="text-[9px] font-black text-text-quaternary uppercase tracking-widest">Awaiting Forensic Stream</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 bg-white/[0.02] border border-border-standard rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/30" />
                        <p className="text-[11px] text-text-secondary leading-relaxed font-medium italic">"{vault.notes}"</p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                         <div className="flex gap-1">
                            {[1,2,3,4].map(i => <div key={i} className="w-1 h-1 rounded-full bg-white/10" />)}
                         </div>
                         <button className="text-[8px] font-black text-emerald-500 uppercase tracking-widest hover:underline">Link Forensic ID</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            </div>
          </div>
        </div>

          {rightTab === 'threads' && (
            <div className="p-6 border-t border-border-subtle bg-white/[0.01]">
              <div className="relative">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add internal note..."
                  className="w-full bg-transparent border border-border-standard rounded-2xl p-4 pr-12 text-xs text-text-primary placeholder:text-text-quaternary focus:border-brand-indigo outline-none transition-all resize-none h-24"
                />
                <button 
                  onClick={() => {
                    if (commentText.trim() && selectedCase) {
                      addComment(selectedCase.id, commentText);
                      setCommentText('');
                    }
                  }}
                  className="absolute bottom-4 right-4 p-2 bg-brand-indigo text-white rounded-xl shadow-lg shadow-brand-indigo/20 hover:bg-brand-indigo/90 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      ) : (
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
           <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div>
                 <h3 className="text-xl font-black text-white tracking-tight mb-1">Route Pathing</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{routeCaseIds.length} Locations in Sequence</p>
              </div>
              <button 
                onClick={() => setRouteCaseIds([])}
                className="px-4 py-2 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-400/10 rounded-lg transition-all"
              >
                Clear Route
              </button>
           </div>
           
           <div className="flex-1 relative">
              <MapContainer center={[19.0760, 72.8777]} zoom={12} scrollWheelZoom={true} className="h-full w-full z-0">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {routeCases.map((c, idx) => (
                  <Marker key={c.id} position={[c.location.lat, c.location.lng]}>
                    <Popup className="custom-popup">
                      <div className="p-4 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="w-5 h-5 rounded-full bg-brand-indigo text-white text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                           <span className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">{c.id}</span>
                        </div>
                        <h4 className="font-black text-white text-sm mb-1">{c.location.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mb-3">{c.location.address}</p>
                        <button 
                          onClick={() => {
                            setSelectedAgentCaseId(c.id);
                            setAgentViewMode('timeline');
                          }}
                          className="w-full py-2 bg-white/5 hover:bg-white/10 text-[9px] font-black text-white uppercase tracking-widest rounded-lg border border-white/10 transition-all"
                        >
                          View Timeline
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Route Overlay List */}
              <div className="absolute top-6 right-6 z-10 w-64 max-h-[calc(100%-48px)] overflow-y-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Route Sequence</h4>
                 <div className="space-y-4">
                    {routeCases.map((c, idx) => (
                      <div key={c.id} className="flex gap-4 group">
                         <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-brand-indigo text-white text-[10px] font-black flex items-center justify-center shrink-0">
                               {idx + 1}
                            </div>
                            {idx < routeCases.length - 1 && <div className="w-0.5 flex-1 bg-brand-indigo/30" />}
                         </div>
                         <div className="flex-1 pb-4">
                            <p className="text-[11px] font-black text-white truncate">{c.location.name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{c.location.city}</p>
                         </div>
                      </div>
                    ))}
                    {routeCases.length === 0 && (
                      <p className="text-[10px] text-slate-500 font-bold italic">No locations added to route yet.</p>
                    )}
                 </div>
              </div>
           </div>
        </div>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-bg-panel border border-border-subtle rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-border-subtle bg-white/[0.02]">
          <h3 className="text-h3 text-text-primary tracking-tight mb-2">Resolve Case</h3>
          <p className="text-text-tertiary text-sm font-medium">Add your field findings before sending to Litigation.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Resolution Findings</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the proof collected or the resolution details..."
              className="w-full h-40 bg-white/[0.02] border border-border-standard rounded-2xl p-4 text-sm text-text-primary focus:ring-1 focus:ring-brand-indigo outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-8 bg-white/[0.01] border-t border-border-subtle flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white/[0.02] hover:bg-white/[0.04] text-text-tertiary text-xs font-black uppercase tracking-widest rounded-2xl transition-all border border-border-standard"
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

const LEGAL_TEMPLATES = [
  { id: 'standard', name: 'Standard Notice' },
  { id: 'final', name: 'Final Warning' },
  { id: 'escalated', name: 'Escalated Demand' },
  { id: 'settlement', name: 'Settlement Offer' }
];

function LitigationDashboard({ allCases, onSelectCase, onUpdateStage, setActiveTab, onAddComment, addNotification }: { allCases: Case[], onSelectCase: (id: string) => void, onUpdateStage: (id: string, stage: CaseStage, notes?: string, type?: 'Agent' | 'Lawyer', resNote?: string, resAgentName?: string, selectedVaultIds?: string[]) => void, setActiveTab: (tab: string) => void, onAddComment: (id: string, text: string) => void, addNotification: (msg: string, type?: 'major' | 'info') => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenueName, setSelectedVenueName] = useState<string | null>(null);
  const [selectedLocalCaseId, setSelectedLocalCaseId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(LEGAL_TEMPLATES[0]);
  const [isFormulating, setIsFormulating] = useState(false);
  const [detailTab, setDetailTab] = useState<'evidence' | 'threads' | 'formulation' | 'audit'>('evidence');
  const [newComment, setNewComment] = useState('');

  const dossiers = useMemo(() => {
    const groups: Record<string, Case[]> = {};
    const filtered = searchQuery 
      ? allCases.filter(c => 
          c.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allCases;

    filtered.forEach(c => {
      if (!groups[c.location.name]) groups[c.location.name] = [];
      groups[c.location.name].push(c);
    });

    return Object.entries(groups).map(([name, cases]) => {
      const activeCases = cases.filter(c => c.stage === 'Ready For Legal' || c.stage === 'Recovery In Progress');
      const historicalCases = cases.filter(c => c.stage === 'Closed');
      
      const sortedCases = [...cases].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      const totalInfractions = cases.length;
      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (totalInfractions > 5) riskLevel = 'Critical';
      else if (totalInfractions > 3) riskLevel = 'High';
      else if (totalInfractions > 1) riskLevel = 'Medium';

      return {
        venueName: name,
        location: cases[0].location,
        activeCases: activeCases.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        historicalCases: historicalCases.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        allCases: sortedCases,
        totalInfractions,
        riskLevel
      };
    }).filter(d => d.activeCases.length > 0);
  }, [allCases, searchQuery]);

  const currentDossier = useMemo(() => {
    if (selectedVenueName) return dossiers.find(d => d.venueName === selectedVenueName) || dossiers[0];
    return dossiers[0];
  }, [selectedVenueName, dossiers]);

  const currentCase = useMemo(() => {
    if (!currentDossier) return null;
    if (selectedLocalCaseId) return currentDossier.allCases.find(c => c.id === selectedLocalCaseId) || currentDossier.activeCases[0];
    return currentDossier.activeCases[0];
  }, [selectedLocalCaseId, currentDossier]);

  useEffect(() => {
    if (currentDossier && !selectedVenueName) {
      setSelectedVenueName(currentDossier.venueName);
    }
  }, [currentDossier]);

  if (!currentDossier) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950">
        <Inbox className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-bold">No venues currently in litigation</p>
      </div>
    );
  }

  const ribbonColor = currentDossier.activeCases.some((c: Case) => c.stage === 'Ready For Legal') ? 'bg-red-500' : 
                     currentDossier.activeCases.some((c: Case) => c.stage === 'Recovery In Progress') ? 'bg-yellow-500' : 'bg-emerald-500';

  const riskColors = {
    Low: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    High: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    Critical: 'text-red-400 bg-red-400/10 border-red-400/20'
  };

  return (
    <div className="h-full flex overflow-hidden bg-bg-panel">
      {/* Column 1: Venue Navigation */}
      <div className="w-64 border-r border-border-subtle flex flex-col bg-white/[0.01] overflow-hidden">
        <div className="p-6 border-b border-border-subtle">
          <h2 className="text-[10px] font-black text-text-quaternary uppercase tracking-[0.2em] mb-4">Venues</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-quaternary" />
            <input 
              type="text" 
              placeholder="Filter..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white/[0.02] border border-border-standard rounded-md text-[11px] text-text-primary focus:ring-1 focus:ring-brand-indigo outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {dossiers.map((d) => (
            <button
              key={d.venueName}
              onClick={() => {
                setSelectedVenueName(d.venueName);
                setSelectedLocalCaseId(null);
              }}
              className={cn(
                "w-full text-left p-4 border-b border-border-subtle transition-all relative group",
                selectedVenueName === d.venueName ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
              )}
            >
              {selectedVenueName === d.venueName && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent-violet" />}
              <div className="flex justify-between items-start mb-1">
                <span className="text-[11px] font-bold text-text-primary truncate flex-1">{d.venueName}</span>
                <span className={cn("w-1.5 h-1.5 rounded-full mt-1", 
                  d.activeCases.some(c => c.stage === 'Ready For Legal') ? 'bg-red-500' : 'bg-emerald-500'
                )} />
              </div>
              <div className="flex items-center gap-2 text-[9px] text-text-tertiary font-bold uppercase tracking-widest">
                <span>{d.location.city}</span>
                <span>•</span>
                <span>{d.totalInfractions} Cases</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Column 2: Venue Summary & Case List */}
      <div className="w-80 border-r border-border-subtle flex flex-col bg-white/[0.005] overflow-hidden">
        <div className="p-6 border-b border-border-subtle space-y-4">
          <div>
            <h3 className="text-h3 text-text-primary tracking-tight mb-1">{currentDossier.venueName}</h3>
            <div className="flex items-center gap-2 text-tiny text-text-tertiary font-bold uppercase tracking-widest">
              <span className={cn("px-1.5 py-0.5 rounded border text-[9px]", riskColors[currentDossier.riskLevel as keyof typeof riskColors])}>
                {currentDossier.riskLevel} Risk
              </span>
              <span>₹{(currentDossier.allCases.reduce((acc: number, c: Case) => acc + c.recoverableValue, 0) / 1000).toFixed(0)}k Potential</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h4 className="text-[9px] font-black text-text-quaternary uppercase tracking-widest mb-3 px-2">Active Infractions</h4>
            <div className="space-y-1.5">
              {currentDossier.activeCases.map((c: Case) => (
                <button 
                  key={c.id}
                  onClick={() => setSelectedLocalCaseId(c.id)}
                  className={cn(
                    "w-full p-3 rounded-lg border transition-all text-left group relative",
                    (selectedLocalCaseId === c.id || (!selectedLocalCaseId && currentDossier.activeCases[0].id === c.id))
                      ? "bg-white/[0.04] border-border-subtle" 
                      : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-border-standard"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{c.id}</span>
                    <span className="text-[9px] text-text-quaternary font-bold">{format(c.timestamp, 'MMM d')}</span>
                  </div>
                  <h5 className="text-[11px] font-semibold text-text-primary truncate">{c.songAssessment.title}</h5>
                </button>
              ))}
            </div>
          </div>

          {currentDossier.historicalCases.length > 0 && (
            <div>
              <h4 className="text-[9px] font-black text-text-quaternary uppercase tracking-widest mb-3 px-2">Historical</h4>
              <div className="space-y-1.5">
                {currentDossier.historicalCases.map((c: Case) => (
                  <button 
                    key={c.id}
                    onClick={() => setSelectedLocalCaseId(c.id)}
                    className={cn(
                      "w-full p-3 rounded-lg border transition-all text-left group relative",
                      selectedLocalCaseId === c.id 
                        ? "bg-white/[0.04] border-border-subtle" 
                        : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-border-standard"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{c.id}</span>
                      <span className="text-[9px] text-text-quaternary font-bold">{format(c.timestamp, 'MMM d')}</span>
                    </div>
                    <h5 className="text-[11px] font-semibold text-text-primary truncate">{c.songAssessment.title}</h5>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Case Detail & Legal Formulation */}
      <div className="flex-1 overflow-y-auto bg-bg-panel p-12">
        {currentCase ? (
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Consolidated Case Dossier Header */}
            <div className="p-10 bg-white/[0.02] rounded-[40px] border border-border-standard shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-indigo/5 blur-[100px] -mr-32 -mt-32" />
              
              <div className="relative z-10 space-y-10">
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-brand-indigo/10 text-brand-indigo text-[10px] font-black tracking-widest uppercase rounded-full border border-brand-indigo/20">
                        {currentCase.id}
                      </span>
                      <span className="text-text-quaternary text-[11px] font-bold uppercase tracking-widest">
                        Infraction Recorded {format(currentCase.timestamp, 'MMM d, yyyy • HH:mm')}
                      </span>
                    </div>
                    <h3 className="text-5xl font-black text-text-primary tracking-tighter leading-none">
                      {currentCase.songAssessment.title}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Music className="w-5 h-5 text-brand-indigo" />
                        <span className="text-lg font-bold">{currentCase.songAssessment.artists.join(', ')}</span>
                      </div>
                      <span className="h-1 w-1 rounded-full bg-border-standard" />
                      <span className="text-text-tertiary font-medium uppercase tracking-widest text-xs">{currentCase.musicLabel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-text-quaternary uppercase tracking-widest mb-2">Recoverable Value</p>
                    <div className="flex items-baseline justify-end gap-2">
                      <span className="text-5xl font-black text-text-primary tracking-tighter">₹{currentCase.recoverableValue.toLocaleString()}</span>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">High Recovery Probability</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-12 pt-10 border-t border-border-subtle">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Forensic Identifiers</p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">ISRC Code</p>
                        <p className="text-sm font-black text-text-primary font-mono">{currentCase.songAssessment.isrc}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">UPC / EAN</p>
                        <p className="text-sm font-black text-text-primary font-mono">{currentCase.songAssessment.upc}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Rights Association</p>
                        <p className="text-sm font-black text-brand-indigo uppercase tracking-widest">{currentCase.songAssessment.rightsAssociation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Venue Intelligence</p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Establishment</p>
                        <p className="text-sm font-black text-text-primary">{currentCase.location.name}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-text-quaternary shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-text-secondary leading-relaxed">{currentCase.location.address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-text-quaternary shrink-0" />
                        <p className="text-xs font-bold text-text-secondary">{currentCase.location.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Case Status</p>
                    <div className="space-y-4">
                      <div className="p-4 bg-white/[0.02] rounded-2xl border border-border-standard">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn("w-2.5 h-2.5 rounded-full", currentCase.stage === 'Closed' ? "bg-emerald-500" : "bg-red-500")} />
                          <span className="text-xs font-black text-text-primary uppercase tracking-widest">{currentCase.stage}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-indigo flex items-center justify-center text-[10px] font-black text-white">
                            {currentCase.assignedTo?.split(' ')[1][0] || 'L'}
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-text-quaternary uppercase tracking-widest">Lead Counsel</p>
                            <p className="text-[11px] font-bold text-text-secondary">{currentCase.assignedTo || 'Unassigned'}</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          onSelectCase(currentCase.id);
                          setActiveTab('cases');
                        }}
                        className="w-full py-3 bg-white/[0.04] hover:bg-white/[0.08] text-text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-border-standard"
                      >
                        View Full Evidence Vault
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-8 border-b border-border-subtle mb-8">
              <button 
                onClick={() => setDetailTab('evidence')}
                className={cn(
                  "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative",
                  detailTab === 'evidence' ? "text-text-primary" : "text-text-quaternary hover:text-text-secondary"
                )}
              >
                Evidence & Intelligence
                {detailTab === 'evidence' && <motion.div layoutId="lit-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-indigo" />}
              </button>
              <button 
                onClick={() => setDetailTab('threads')}
                className={cn(
                  "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2",
                  detailTab === 'threads' ? "text-text-primary" : "text-text-quaternary hover:text-text-secondary"
                )}
              >
                Internal Threads
                {currentCase.unreadComments && <div className="w-1.5 h-1.5 rounded-full bg-brand-indigo" />}
                {detailTab === 'threads' && <motion.div layoutId="lit-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-indigo" />}
              </button>
              <button 
                onClick={() => setDetailTab('formulation')}
                className={cn(
                  "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2",
                  detailTab === 'formulation' ? "text-text-primary" : "text-text-quaternary hover:text-text-secondary"
                )}
              >
                Legal Formulation
                {detailTab === 'formulation' && <motion.div layoutId="lit-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-indigo" />}
              </button>
              <button 
                onClick={() => setDetailTab('audit')}
                className={cn(
                  "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2",
                  detailTab === 'audit' ? "text-text-primary" : "text-text-quaternary hover:text-text-secondary"
                )}
              >
                Status Audit Trail
                {detailTab === 'audit' && <motion.div layoutId="lit-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-indigo" />}
              </button>
            </div>

            {detailTab === 'evidence' ? (
              <div className="space-y-10">
                {/* Master Evidence & Intelligence Consolidated */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-text-quaternary uppercase tracking-[0.2em]">Master Forensic Package</h4>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-brand-indigo/10 border border-brand-indigo/20 rounded-full text-[9px] font-black text-brand-indigo uppercase tracking-widest">
                        Master Intelligence Active
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 bg-white/[0.02] rounded-[40px] border border-border-standard overflow-hidden shadow-2xl group">
                    {/* Video Side */}
                    <div className="lg:col-span-3 aspect-video bg-black relative overflow-hidden group-hover:shadow-[0_0_50px_rgba(99,102,241,0.1)] transition-all">
                      <video 
                        src={currentCase.videoProofUrl} 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        controls
                      />
                      <div className="absolute top-8 left-8 px-5 py-2.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Forensic Stream</span>
                      </div>
                    </div>

                    {/* AI Info Side */}
                    <div className="lg:col-span-2 p-10 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-indigo/5 blur-[50px] -mr-16 -mt-16" />
                      
                      <div className="space-y-8 relative z-10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-indigo/10 flex items-center justify-center border border-brand-indigo/20">
                            <Activity className="w-5 h-5 text-brand-indigo" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-text-quaternary uppercase tracking-widest mb-0.5">Automated Intelligence</p>
                            <h4 className="text-lg font-black text-text-primary tracking-tight">Forensic Verdict</h4>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <p className="text-base text-text-secondary leading-relaxed font-medium italic border-l-2 border-brand-indigo/30 pl-6 py-1">
                            "{currentCase.aiExplanation}"
                          </p>
                          
                          <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-text-quaternary">
                              <span>Confidence Index</span>
                              <span className="text-brand-indigo">{currentCase.qualityScore}%</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${currentCase.qualityScore}%` }}
                                className="h-full bg-gradient-to-r from-brand-indigo to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 grid grid-cols-2 gap-4 relative z-10">
                        {Object.entries(currentCase.trustGates).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-border-standard rounded-lg">
                            <div className={cn("w-1.5 h-1.5 rounded-full", value ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-white/10")} />
                            <span className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Snapshot (Mini Audit Trail) */}
                <div className="p-8 bg-white/[0.02] rounded-[40px] border border-border-standard">
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Latest Audit Snapshot</p>
                    <button 
                      onClick={() => setDetailTab('audit')}
                      className="text-[9px] font-black text-brand-indigo uppercase tracking-widest hover:underline"
                    >
                      Full Audit Trail
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {currentCase.auditTrail.slice(-3).reverse().map((entry, idx) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                          idx === 0 ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" : "bg-text-quaternary"
                        )} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-text-primary uppercase tracking-widest truncate">{entry.action}</p>
                          <p className="text-[9px] text-text-tertiary font-bold mb-1">{entry.actor}</p>
                          <p className="text-[8px] text-text-quaternary font-bold">{format(new Date(entry.timestamp), 'HH:mm:ss')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Vaults Grid */}
                <div className="space-y-8">
                  <h4 className="text-[11px] font-black text-text-quaternary uppercase tracking-[0.2em]">Package Intelligence</h4>
                  <div className="grid grid-cols-2 gap-8">
                    {currentCase.evidenceVaults.map(vault => {
                      const isSelected = currentCase.selectedVaultIds?.includes(vault.id);
                      return (
                        <div 
                          key={vault.id} 
                          className={cn(
                            "p-8 transition-all border rounded-[40px] flex flex-col justify-between group",
                            isSelected 
                              ? "bg-white/[0.03] border-brand-indigo/30 shadow-lg shadow-brand-indigo/5" 
                              : "bg-white/[0.01] border-border-standard/50 opacity-40 hover:opacity-100 grayscale hover:grayscale-0 scale-95 hover:scale-100"
                          )}
                        >
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Shield className={cn("w-5 h-5", isSelected ? "text-brand-indigo" : "text-text-quaternary")} />
                                <h4 className="text-lg font-black text-text-primary tracking-tight">{vault.name}</h4>
                                {isSelected && (
                                  <span className="px-2 py-0.5 bg-brand-indigo/20 text-brand-indigo text-[8px] font-black uppercase rounded tracking-widest">Included</span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-text-quaternary uppercase tracking-widest">{format(vault.timestamp, 'MMM d, HH:mm')}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              {vault.images.map((img, i) => (
                                <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              ))}
                            </div>
                            <p className="text-sm text-text-tertiary leading-relaxed italic">"{vault.notes}"</p>
                          </div>
                          {isSelected && (
                            <div className="mt-6 pt-6 border-t border-brand-indigo/10 flex items-center justify-between">
                               <div className="text-[9px] font-black text-brand-indigo uppercase tracking-widest">Legally Verified Package</div>
                               <div className="flex gap-1">
                                  {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 rounded-full bg-brand-indigo" />)}
                               </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : detailTab === 'threads' ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-text-quaternary uppercase tracking-[0.2em]">Internal Discussion</h4>
                  <span className="text-[10px] font-bold text-text-quaternary uppercase tracking-widest">{currentCase.comments.length} Messages</span>
                </div>

                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                  {currentCase.comments.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-text-quaternary/20">
                      <MessageSquare className="w-12 h-12 mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">No internal threads yet</p>
                    </div>
                  ) : (
                    currentCase.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white shrink-0",
                          comment.role === 'Admin' ? "bg-brand-indigo" : comment.role === 'Lawyer' ? "bg-emerald-600" : "bg-cyan-600"
                        )}>
                          {comment.author[0]}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-text-primary">{comment.author}</span>
                              <span className="text-[9px] font-black text-text-quaternary uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/[0.04] border border-border-standard">
                                {comment.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-quaternary font-bold">{format(comment.timestamp, 'MMM d, p')}</span>
                          </div>
                          <div className="p-4 bg-white/[0.02] border border-border-standard rounded-2xl rounded-tl-none">
                            <p className="text-sm text-text-secondary leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-8 border-t border-border-subtle">
                  <div className="relative">
                    <textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add an internal note or legal observation..."
                      className="w-full h-32 bg-white/[0.02] border border-border-standard rounded-3xl p-6 text-sm text-text-primary focus:ring-1 focus:ring-brand-indigo outline-none transition-all resize-none pr-16"
                    />
                    <button 
                      onClick={() => {
                        if (newComment.trim()) {
                          onAddComment(currentCase.id, newComment);
                          setNewComment('');
                        }
                      }}
                      disabled={!newComment.trim()}
                      className="absolute bottom-6 right-6 w-10 h-10 bg-brand-indigo hover:bg-brand-indigo/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-brand-indigo/20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-4 text-[9px] text-text-quaternary font-bold uppercase tracking-widest text-center">
                    Notes added here are only visible to the legal and operations team.
                  </p>
                </div>
              </div>
            ) : detailTab === 'audit' ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-text-quaternary uppercase tracking-[0.2em]">Case Status Audit Trail</h4>
                  <span className="text-[10px] font-bold text-text-quaternary uppercase tracking-widest">{currentCase.auditTrail.length} Logged Updates</span>
                </div>
                
                <div className="bg-white/[0.02] border border-border-standard rounded-[40px] p-10 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-indigo/5 to-transparent pointer-events-none opacity-20" />
                  
                  <div className="relative space-y-12">
                    {currentCase.auditTrail.slice().reverse().map((entry, idx) => {
                      const isMajor = entry.action === "Evidence Vault Created" || entry.action === "Case Resolved" || entry.action === "Status Transition";
                      
                      return (
                        <div key={entry.id} className="relative pl-10 border-l border-border-standard/50 pb-2 last:pb-0">
                          {/* Indicator Dot */}
                          <div className={cn(
                            "absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-bg-panel",
                            isMajor ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-text-quaternary"
                          )} />
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                  "bg-white/5 text-text-quaternary border border-border-standard"
                                )}>
                                  {entry.action}
                                </span>
                                <span className="text-[10px] text-text-quaternary/50 font-bold">•</span>
                                <span className="text-[10px] text-text-quaternary font-bold uppercase tracking-widest">{entry.actor}</span>
                                {entry.type && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-brand-indigo/10 text-brand-indigo rounded uppercase tracking-widest">
                                    {entry.type}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-text-quaternary font-bold">{format(new Date(entry.timestamp), 'MMM d, HH:mm:ss')}</span>
                            </div>
                            
                            <p className="text-sm text-text-secondary font-medium leading-relaxed max-w-2xl">
                              {entry.details}
                            </p>

                            {entry.newStage && entry.previousStage !== entry.newStage && (
                              <div className="flex items-center gap-2 pt-2">
                                <span className="text-[8px] font-black text-text-quaternary uppercase tracking-widest">Stage Evolution:</span>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-black text-text-tertiary uppercase tracking-widest">{entry.previousStage}</span>
                                  <ArrowRight className="w-2 h-2 text-text-quaternary" />
                                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-400 uppercase tracking-widest">{entry.newStage}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="p-10 bg-white/[0.02] rounded-[40px] border border-border-standard relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-indigo/5 blur-[100px] -mr-32 -mt-32" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-brand-indigo flex items-center justify-center shadow-xl shadow-brand-indigo/20">
                        <Gavel className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-indigo uppercase tracking-widest mb-1">AI Legal Engine</p>
                        <h4 className="text-2xl font-black text-text-primary tracking-tight">Formulation Strategy</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Notice Template</label>
                        <div className="grid grid-cols-2 gap-3">
                          {LEGAL_TEMPLATES.map(t => (
                            <button
                              key={t.id}
                              onClick={() => setSelectedTemplate(t)}
                              className={cn(
                                "p-4 rounded-2xl border text-left transition-all",
                                selectedTemplate.id === t.id 
                                  ? "bg-brand-indigo/10 border-brand-indigo/40 text-brand-indigo" 
                                  : "bg-white/[0.02] border-border-standard text-text-tertiary hover:bg-white/[0.04]"
                              )}
                            >
                              <p className="text-[10px] font-black uppercase tracking-widest">{t.name}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Recovery Parameters</label>
                        <div className="p-6 bg-white/[0.02] border border-border-standard rounded-2xl space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-text-tertiary">Statutory Damages</span>
                            <span className="text-xs font-black text-text-primary">₹{currentCase.recoverableValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-text-tertiary">Legal Fees (Est.)</span>
                            <span className="text-xs font-black text-text-primary">₹12,500</span>
                          </div>
                          <div className="pt-4 border-t border-border-subtle flex justify-between items-center">
                            <span className="text-xs font-black text-brand-indigo uppercase tracking-widest">Total Demand</span>
                            <span className="text-sm font-black text-text-primary">₹{(currentCase.recoverableValue + 12500).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <button 
                        onClick={() => {
                          setIsFormulating(true);
                          setTimeout(() => {
                            setIsFormulating(false);
                            addNotification(`Legal Notice Generated for ${currentCase.id}`, 'info');
                          }, 2000);
                        }}
                        disabled={isFormulating}
                        className="w-full py-6 bg-brand-indigo text-white text-xs font-black uppercase tracking-[0.2em] rounded-[24px] shadow-2xl shadow-brand-indigo/30 hover:bg-brand-indigo/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isFormulating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Synthesizing Legal Strategy...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Generate Legal Notice
                          </>
                        )}
                      </button>

                      {/* Generated Notice Preview */}
                      <AnimatePresence>
                        {!isFormulating && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-8 bg-slate-950 rounded-3xl border border-border-standard font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar"
                          >
                            {generateLegalNotice(currentCase, currentDossier, selectedTemplate)}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <p className="text-center text-[9px] font-bold text-text-quaternary uppercase tracking-widest">
                        Strategy based on IPRS statutory guidelines and venue infraction history.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-10 bg-white/[0.02] rounded-[40px] border border-border-standard">
                  <div className="flex items-center gap-3 mb-8">
                    <FileText className="w-5 h-5 text-brand-indigo" />
                    <p className="text-[10px] font-black text-text-quaternary uppercase tracking-widest">Strategy Preview</p>
                  </div>
                  <div className="space-y-6">
                    <div className="h-4 w-3/4 bg-white/[0.05] rounded-full animate-pulse" />
                    <div className="h-4 w-full bg-white/[0.05] rounded-full animate-pulse delay-75" />
                    <div className="h-4 w-5/6 bg-white/[0.05] rounded-full animate-pulse delay-150" />
                    <div className="h-4 w-2/3 bg-white/[0.05] rounded-full animate-pulse delay-300" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <Inbox className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-lg font-bold uppercase tracking-widest opacity-20">Select a case to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

function generateLegalNotice(caseData: Case, dossier: any, template: typeof LEGAL_TEMPLATES[0]) {
  const date = format(new Date(), 'MMMM d, yyyy');
  const pastInfractions = dossier.historicalCases.length;
  
  let header = "LEGAL NOTICE OF COPYRIGHT INFRINGEMENT";
  let body = "";

  if (template.id === 'escalated') {
    header = "ESCALATED DEMAND: NOTICE OF INTENT TO SUE";
    body = `As a repeat offender with ${pastInfractions} prior recorded infractions, your establishment is now subject to escalated legal proceedings. We have documented continuous non-compliance with music licensing regulations.`;
  } else if (template.id === 'final') {
    header = "FINAL PRE-LITIGATION WARNING";
    body = "This is your final notice before we initiate formal litigation in the High Court. All evidence has been forensically sealed and is ready for submission.";
  } else if (template.id === 'settlement') {
    header = "SETTLEMENT OFFER & RELEASE OF LIABILITY";
    body = "In the interest of resolving this matter without costly litigation, we are prepared to offer a one-time settlement release upon payment of the demanded sum.";
  } else {
    body = `This formal notice is issued regarding the unauthorized public performance of copyrighted musical works at your establishment. Our forensic systems have verified an infraction on ${format(caseData.timestamp, 'PPPP')} at ${format(caseData.timestamp, 'p')}.`;
  }
  
  return `${header}
Date: ${date}

TO: Management of ${dossier.venueName}
ADDRESS: ${dossier.location.address}, ${dossier.location.city}

RE: Formal Demand for Compensation - Case ${caseData.id}

Dear Management,

${body}

INFRACTION DETAILS:
- Track Title: ${caseData.songAssessment.title}
- Artist: ${caseData.songAssessment.artists.join(', ')}
- Rights Holder: ${caseData.musicLabel}
- Forensic Confidence: ${caseData.qualityScore}%

HISTORY OF NON-COMPLIANCE:
Records indicate that ${dossier.venueName} has ${pastInfractions > 0 ? `${pastInfractions} previous recorded infractions` : 'no prior recorded infractions'}.

DEMAND:
We hereby demand immediate settlement of ₹${caseData.recoverableValue.toLocaleString()} to avoid further litigation. Failure to respond within 7 business days will result in a formal suit filed in the appropriate jurisdiction.

Sincerely,
Legal Recovery Department
Forensic Music Rights Management`;
}

function AssignmentCard({ caseData, onSelectCase, onUpdateStage, setActiveTab, onOpenResolvedModal }: { caseData: Case, key?: string, onSelectCase?: (id: string) => void, onUpdateStage?: (id: string, stage: CaseStage, notes?: string, type?: 'Agent' | 'Lawyer', resNote?: string, resAgentName?: string) => void, setActiveTab?: (tab: string) => void, onOpenResolvedModal?: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-border-standard rounded-xl p-8 shadow-sm hover:border-border-subtle transition-all group"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
          <span className="text-tiny font-black text-text-quaternary uppercase tracking-widest mb-1">{caseData.id}</span>
          <h4 className="text-h3 text-text-primary tracking-tight mb-2">{caseData.location.name}</h4>
          
          <div className="flex gap-4">
             <div className="group/tooltip relative">
                <MapPin className="w-4 h-4 text-text-quaternary hover:text-accent-violet cursor-help transition-colors" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50 w-48 p-3 bg-bg-surface border border-border-standard rounded-lg shadow-2xl text-tiny font-bold text-text-secondary leading-relaxed">
                   <p className="text-accent-violet uppercase tracking-widest mb-1 text-[8px]">Venue Address</p>
                   {caseData.location.address}
                </div>
             </div>
             <div className="group/tooltip relative">
                <Phone className="w-4 h-4 text-text-quaternary hover:text-accent-violet cursor-help transition-colors" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50 w-40 p-3 bg-bg-surface border border-border-standard rounded-lg shadow-2xl text-tiny font-bold text-text-secondary">
                   <p className="text-accent-violet uppercase tracking-widest mb-1 text-[8px]">Contact Number</p>
                   {caseData.location.phone}
                </div>
             </div>
             <div className="group/tooltip relative">
                <Mail className="w-4 h-4 text-text-quaternary hover:text-accent-violet cursor-help transition-colors" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50 w-48 p-3 bg-bg-surface border border-border-standard rounded-lg shadow-2xl text-tiny font-bold text-text-secondary">
                   <p className="text-accent-violet uppercase tracking-widest mb-1 text-[8px]">Email Address</p>
                   {caseData.location.email}
                </div>
             </div>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center border border-border-subtle">
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
