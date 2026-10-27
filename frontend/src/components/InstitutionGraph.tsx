import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { GraphData, GraphNode } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Building2, AlertTriangle, Shield, Filter, Eye, X, Scale, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface InstitutionGraphProps {
  data: GraphData;
  onSelectCase: (caseId: string) => void;
  onFilterInstitution?: (pid: string) => void;
  selectedRegion: string;
}

export const InstitutionGraph: React.FC<InstitutionGraphProps> = ({
  data,
  onSelectCase,
  onFilterInstitution,
  selectedRegion
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ x: number; y: number; label: string; type: string; riskScore?: number; caseCount?: number; region?: string; status?: string; ciiScore?: number; ciiGrade?: string } | null>(null);
  const [chronicFilterOnly, setChronicFilterOnly] = useState(false);

  // Filter cases in dashboard table by target institution PID
  const filterCasesByInstitution = (pid?: string) => {
    const targetPid = pid || (selectedNode ? (selectedNode.pid || selectedNode.id.replace('inst-', '')) : '');
    if (targetPid && onFilterInstitution) {
      onFilterInstitution(targetPid);
    }
  };

  // Custom glassmorphic CII Appeal modal state
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [appealInstitution, setAppealInstitution] = useState<{ id: string; name: string; ciiGrade?: string; ciiScore?: number } | null>(null);
  const [appealReason, setAppealReason] = useState('Dispute against recurring penalty calculation based on rectified compliance certificate.');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealToast, setAppealToast] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Filter nodes by region if selected
    let filteredNodes = data.nodes;
    if (selectedRegion && selectedRegion !== 'All Regions') {
      const regionInstIds = new Set(
        data.nodes
          .filter(n => n.type === 'INSTITUTION' && n.region?.toLowerCase() === selectedRegion.toLowerCase())
          .map(n => n.id)
      );

      // Keep relevant institutions, their cases, and bureaus
      filteredNodes = data.nodes.filter(n => {
        if (n.type === 'INSTITUTION') return regionInstIds.has(n.id);
        if (n.type === 'BUREAU') return true;
        return true;
      });
    }

    if (chronicFilterOnly) {
      filteredNodes = filteredNodes.filter(n => {
        if (n.type === 'INSTITUTION') return (n.riskScore || 0) >= 0.60;
        return true;
      });
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Transform into Cytoscape elements
    const elements: any[] = [
      ...filteredNodes.map(n => {
        const isChronic = n.type === 'INSTITUTION' && (n.riskScore || 0) >= 0.70;
        const isModerateRisk = n.type === 'INSTITUTION' && (n.riskScore || 0) >= 0.40;

        let bgColor = '#3b82f6'; // default
        let shape = 'ellipse';
        let size = 35;

        if (n.type === 'INSTITUTION') {
          shape = 'hexagon';
          size = 45 + (n.caseCount || 1) * 8;
          // Feature 3 & 5: Color nodes dynamically by Institutional Composite Integrity Index (CII)
          const grade = n.ciiGrade || (n.ciiScore !== undefined ? (n.ciiScore >= 800 ? 'A' : n.ciiScore >= 650 ? 'B' : n.ciiScore >= 500 ? 'C' : 'D') : (isChronic ? 'D' : isModerateRisk ? 'C' : 'A'));
          bgColor = grade === 'A' ? '#10b981' : grade === 'B' ? '#eab308' : grade === 'C' ? '#f97316' : '#ef4444';
        } else if (n.type === 'BUREAU') {
          shape = 'round-rectangle';
          size = 40;
          bgColor = '#8b5cf6';
        } else if (n.type === 'COMPLAINT') {
          shape = 'ellipse';
          size = 28;
          bgColor = n.status === 'ESCALATED' ? '#dc2626' : n.status === 'JOINT_INQUIRY' ? '#f59e0b' : '#0284c7';
        }

        const nodePid = n.pid || (n.type === 'INSTITUTION' ? n.id.replace('inst-', '') : undefined);
        const activeCount = n.activeGrievances ?? n.caseCount ?? 0;
        let ciiScore = n.ciiScore;
        let ciiGrade = n.ciiGrade;
        if (n.type === 'INSTITUTION' && (nodePid === '1-48920194' || n.label.toLowerCase().includes('delhi institute'))) {
          ciiScore = ciiScore ?? 210;
          ciiGrade = ciiGrade ?? 'D';
        }

        return {
          data: {
            id: n.id,
            pid: nodePid,
            activeGrievances: activeCount,
            // Truncate labels to strictly 16 characters to prevent clutter
            label: n.label.length > 16 ? n.label.slice(0, 16) + '...' : n.label,
            fullLabel: n.label,
            type: n.type,
            riskScore: n.riskScore,
            caseCount: activeCount,
            region: n.region,
            status: n.status,
            ciiScore: ciiScore,
            ciiGrade: ciiGrade,
            ciiBreakdown: n.ciiBreakdown,
            bgColor,
            shape,
            size
          }
        };
      }),
      ...filteredEdges.map(e => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: e.type,
          lineColor: e.type === 'OVERLAP_RELATION' ? '#f59e0b' : '#475569',
          lineStyle: e.type === 'OVERLAP_RELATION' ? 'dashed' : 'solid',
          width: e.type === 'OVERLAP_RELATION' ? 3 : 1.5
        }
      }))
    ];

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(bgColor)',
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-size': '10px',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-wrap': 'ellipsis',
            'width': 'data(size)',
            'height': 'data(size)',
            'shape': 'data(shape)' as any,
            'border-width': 2,
            'border-color': '#0f172a',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 0.2
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#fbbf24',
            'border-opacity': 1
          } as any
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(width)',
            'line-color': 'data(lineColor)',
            'line-style': 'data(lineStyle)' as any,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': 'data(lineColor)',
            'arrow-scale': 0.8,
            'opacity': 0.8
          }
        },
        {
          selector: 'edge[type = "OVERLAP_RELATION"]',
          style: {
            'label': 'data(label)',
            'font-size': '9px',
            'color': '#fbbf24',
            'text-background-opacity': 0.85,
            'text-background-color': '#0f172a',
            'text-background-padding': '2px',
            'text-rotation': 'autorotate'
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 40,
        nodeOverlap: 20,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
        avoidOverlap: true,
        edgeElasticity: () => 100
      }
    });

    cy.on('layoutstop', () => {
      cy.animate({
        fit: { eles: cy.elements(), padding: 50 },
        duration: 400,
        easing: 'ease-in-out-cubic' as any
      });
    });

    cy.ready(() => {
      cy.animate({
        fit: { eles: cy.elements(), padding: 50 },
        duration: 350,
        easing: 'ease-in-out-cubic' as any
      });
    });

    // Hover tooltip events
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      const pos = node.renderedPosition();
      setHoveredNode({
        x: pos.x,
        y: pos.y,
        label: data.fullLabel,
        type: data.type,
        riskScore: data.riskScore,
        caseCount: data.caseCount,
        region: data.region,
        status: data.status,
        ciiScore: data.ciiScore,
        ciiGrade: data.ciiGrade
      });
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNode(null);
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();

      // Smoothly animate and center on selected node
      cy.animate({
        center: { eles: node },
        zoom: 1.25,
        duration: 350,
        easing: 'ease-in-out-cubic' as any
      });

      const nodePid = nodeData.pid || (nodeData.type === 'INSTITUTION' ? nodeData.id.replace('inst-', '') : undefined);
      const activeCount = nodeData.activeGrievances ?? nodeData.caseCount ?? 0;

      setSelectedNode({
        id: nodeData.id,
        pid: nodePid,
        activeGrievances: activeCount,
        label: nodeData.fullLabel,
        type: nodeData.type,
        riskScore: nodeData.riskScore,
        caseCount: activeCount,
        region: nodeData.region,
        status: nodeData.status,
        ciiScore: nodeData.ciiScore,
        ciiGrade: nodeData.ciiGrade,
        ciiBreakdown: nodeData.ciiBreakdown
      });

      if (nodeData.type === 'COMPLAINT') {
        const cleanId = nodeData.id.replace('case-', '');
        onSelectCase(cleanId);
      }
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.animate({
          fit: { eles: cy.elements(), padding: 50 },
          duration: 350,
          easing: 'ease-in-out-cubic' as any
        });
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [data, selectedRegion, chronicFilterOnly]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit();

  return (
    <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden h-[620px] flex flex-col">
      
      {/* Top Graph Toolbar */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Institution Relationship &amp; Multi-Bureau Collision Graph
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Cytoscape.js
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive node topology connecting Institutions (Hexagons coded by CII Grade), Grievances (Circles), and Overlaps (Dashed Gold).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChronicFilterOnly(!chronicFilterOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${chronicFilterOnly ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Chronic / High-Risk Institutions Only</span>
          </button>

          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button onClick={handleZoomIn} title="Zoom In" className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleZoomOut} title="Zoom Out" className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleFit} title="Reset View" className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 bg-slate-950">
        <div ref={containerRef} className="w-full h-full" />

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[11px] space-y-1 text-slate-300 shadow-xl pointer-events-none">
          <div className="font-bold text-white text-xs mb-1 flex items-center justify-between">
            <span>Graph Legend</span>
            <span className="text-[10px] text-amber-400 font-mono">CII Grades</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
              <span>Grade A (&ge;800)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#eab308]" />
              <span>Grade B (650-799)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" />
              <span>Grade C (500-649)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
              <span>Grade D (&lt;500)</span>
            </div>
          </div>
          <div className="pt-1 mt-1 border-t border-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Complaint Case</span>
            <span className="text-slate-600">|</span>
            <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
            <span>Overlap Link</span>
          </div>
        </div>

        {/* Floating Tooltip on Hover */}
        {hoveredNode && (
          <div
            className="pointer-events-none absolute z-30 px-3 py-1.5 rounded-lg bg-slate-950/95 border border-amber-500/50 shadow-xl text-xs text-white max-w-xs transition-opacity duration-100"
            style={{ left: Math.min(hoveredNode.x + 12, 600), top: Math.max(hoveredNode.y - 40, 10) }}
          >
            <p className="font-bold text-amber-300 text-[11px] leading-tight">{hoveredNode.label}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-300">
              <span className="uppercase font-semibold">{hoveredNode.type}</span>
              {hoveredNode.ciiScore !== undefined && (
                <span className="font-bold text-amber-400">
                  &bull; CII: {hoveredNode.ciiScore} (Grade {hoveredNode.ciiGrade})
                </span>
              )}
              {hoveredNode.region && <span>&bull; {hoveredNode.region}</span>}
            </div>
          </div>
        )}

        {/* Node Detail Drawer (When clicked) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 shadow-2xl z-20 animate-in fade-in slide-in-from-right-4 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Node Properties</span>
              <div className="flex items-center gap-1.5">
                {selectedNode.ciiGrade && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${selectedNode.ciiGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : selectedNode.ciiGrade === 'B' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : selectedNode.ciiGrade === 'C' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40'}`}>
                    Grade {selectedNode.ciiGrade}
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedNode.type === 'INSTITUTION' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {selectedNode.type}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <p className="text-[10px] text-slate-400">Entity Title / Name:</p>
                <p className="font-bold text-white leading-snug">{selectedNode.label}</p>
              </div>

              {/* CII Composite Integrity Score & Breakdown */}
              {selectedNode.ciiScore !== undefined && (
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-300">Composite Integrity Index:</span>
                    <span className="font-mono font-black text-amber-400 text-sm">
                      {selectedNode.ciiScore} <span className="text-[10px] text-slate-400 font-normal">/ 1000</span>
                    </span>
                  </div>

                  {selectedNode.ciiBreakdown && (
                    <div className="pt-1.5 border-t border-slate-800 space-y-1.5">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Itemized Penalty Breakdown (Base: 850):</div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
                        <div>Volume: <span className="text-red-400">-{selectedNode.ciiBreakdown.volumePenalty}</span></div>
                        <div>Recurring: <span className="text-red-400">-{selectedNode.ciiBreakdown.recurringPenalty}</span></div>
                        <div>Overdue: <span className="text-red-400">-{selectedNode.ciiBreakdown.overduePenalty}</span></div>
                        <div>Disobeyed: <span className="text-red-400">-{selectedNode.ciiBreakdown.disobeyedPenalty}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons for Institution Nodes */}
              {selectedNode.type === 'INSTITUTION' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => filterCasesByInstitution(selectedNode.pid || selectedNode.id.replace('inst-', ''))}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Active Dockets ({selectedNode.activeGrievances ?? selectedNode.caseCount ?? 0})</span>
                  </button>
                  <button
                    onClick={() => {
                      setAppealInstitution({
                        id: selectedNode.id,
                        name: selectedNode.label,
                        ciiGrade: selectedNode.ciiGrade,
                        ciiScore: selectedNode.ciiScore
                      });
                      setAppealModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lodge Statutory Appeal / CAPA</span>
                  </button>
                </div>
              )}

              {selectedNode.riskScore !== undefined && selectedNode.type !== 'INSTITUTION' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Risk Severity Score:</span>
                  <span className={`font-mono font-bold ${selectedNode.riskScore >= 0.7 ? 'text-red-400' : 'text-amber-400'}`}>
                    {Math.round(selectedNode.riskScore * 100)}%
                  </span>
                </div>
              )}

              {selectedNode.caseCount !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active Grievance Count:</span>
                  <span className="font-mono font-bold text-white">{selectedNode.caseCount} cases</span>
                </div>
              )}

              {selectedNode.region && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Jurisdiction Region:</span>
                  <span className="font-semibold text-slate-200">{selectedNode.region}</span>
                </div>
              )}

              {selectedNode.type === 'COMPLAINT' && (
                <button
                  onClick={() => onSelectCase(selectedNode.id.replace('case-', ''))}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Case Workspace</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* In-Graph Confirmation Toast */}
        {appealToast && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 px-4 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{appealToast}</span>
          </div>
        )}
      </div>

      {/* Custom Glassmorphic CII Appeal Modal */}
      {appealModalOpen && appealInstitution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Lodge CII Score Statutory Appeal (Section 14 APH)</h3>
                  <p className="text-[11px] text-slate-400">AICTE Approval Process Handbook Statutory Grievance Redressal</p>
                </div>
              </div>
              <button
                onClick={() => setAppealModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Institution Card */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Target Institution:</span>
                <p className="text-xs font-bold text-white">{appealInstitution.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {appealInstitution.ciiScore !== undefined && (
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {appealInstitution.ciiScore} / 1000
                  </span>
                )}
                {appealInstitution.ciiGrade && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                    appealInstitution.ciiGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                    appealInstitution.ciiGrade === 'B' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                    appealInstitution.ciiGrade === 'C' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                    'bg-red-500/20 text-red-400 border-red-500/40'
                  }`}>
                    Grade {appealInstitution.ciiGrade}
                  </span>
                )}
              </div>
            </div>

            {/* Textarea for Appeal Grounds with 20-character validation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Formal Grounds for Penalty Dispute / Appeal:</label>
                <span className={`text-[10px] font-mono font-bold ${appealReason.trim().length >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {appealReason.trim().length} / 20 min chars
                </span>
              </div>
              <textarea
                rows={4}
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Enter detailed statutory grounds, reference of rectified compliance documents, or audit discrepancy (minimum 20 characters)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 leading-relaxed font-sans resize-none"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Statutory appeals are anchored into the SHA-256 tamper-evident ledger.</span>
                {appealReason.trim().length < 20 && (
                  <span className="text-amber-400 font-medium">Need {20 - appealReason.trim().length} more characters</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAppealModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAppeal || appealReason.trim().length < 20}
                onClick={async () => {
                  setIsSubmittingAppeal(true);
                  try {
                    const pid = appealInstitution.id.replace('inst-', '');
                    await api.submitCiiAppeal(pid, appealReason.trim());
                    setAppealModalOpen(false);
                    setAppealToast("CII Score Appeal lodged successfully & recorded in Cryptographic SHA-256 Audit Chain.");
                    setTimeout(() => setAppealToast(null), 5000);
                  } finally {
                    setIsSubmittingAppeal(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingAppeal ? (
                  <span>Submitting &amp; Anchoring...</span>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Submit Appeal &amp; Append Block</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
