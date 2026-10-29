'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { RecentReturnItem } from '../../lib/types';
import { Card } from '../ui/Card';
import { StatusChip, PathwayBadge } from '../ui/Badge';
import { TableSkeleton } from '../ui/Skeleton';
import {
  Search,
  Laptop,
  Smartphone,
  Headphones,
  Gamepad2,
  Watch,
  Tv,
  Camera,
  Home,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
} from 'lucide-react';

interface RecentReturnsTableProps {
  returns: RecentReturnItem[];
  isLoading: boolean;
  onSelectReturn?: (item: RecentReturnItem) => void;
  pathwayFilter?: string | null;
  onClearPathwayFilter?: () => void;
  defectFilter?: string | null;
  onClearDefectFilter?: () => void;
  externalSearchTerm?: string;
  onOpenIntake?: () => void;
}

export function RecentReturnsTable({
  returns,
  isLoading,
  onSelectReturn,
  pathwayFilter,
  onClearPathwayFilter,
  defectFilter,
  onClearDefectFilter,
  externalSearchTerm = '',
  onOpenIntake,
}: RecentReturnsTableProps) {
  const [searchTerm, setSearchTerm] = useState(externalSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
      setCurrentPage(1);
    }
  }, [externalSearchTerm]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    returns.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats).sort();
  }, [returns]);

  const filteredData = useMemo(() => {
    return returns.filter((item) => {
      if (pathwayFilter) {
        const itemPathway = item.recommended_pathway.toLowerCase();
        const targetPathway = pathwayFilter.toLowerCase();
        if (!itemPathway.includes(targetPathway) && !targetPathway.includes(itemPathway)) {
          return false;
        }
      }

      if (defectFilter) {
        const itemDefect = item.defect_summary.toLowerCase();
        const targetDefect = defectFilter.toLowerCase();
        if (!itemDefect.includes(targetDefect) && !targetDefect.includes(itemDefect)) {
          return false;
        }
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchId = item.id.toLowerCase().includes(q);
        const matchModel = item.brand_model.toLowerCase().includes(q);
        const matchDefect = item.defect_summary.toLowerCase().includes(q);
        const matchPathway = item.recommended_pathway.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchId && !matchModel && !matchDefect && !matchPathway && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [returns, pathwayFilter, defectFilter, statusFilter, categoryFilter, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const getBrandInitial = (brandModel: string) => {
    const firstWord = brandModel.split(' ')[0] || 'D';
    return firstWord.slice(0, 2).toUpperCase();
  };

  const getBrandColor = (brandModel: string) => {
    const s = brandModel.toLowerCase();
    if (s.includes('apple')) return 'bg-slate-900 text-white';
    if (s.includes('dell')) return 'bg-blue-600 text-white';
    if (s.includes('lenovo')) return 'bg-red-600 text-white';
    if (s.includes('samsung')) return 'bg-sky-600 text-white';
    if (s.includes('google')) return 'bg-amber-500 text-white';
    if (s.includes('sony')) return 'bg-neutral-900 text-white';
    return 'bg-[#073E2E] text-white';
  };

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('laptop') || cat.includes('comput')) return Laptop;
    if (cat.includes('phone') || cat.includes('tablet')) return Smartphone;
    if (cat.includes('audio') || cat.includes('sound')) return Headphones;
    if (cat.includes('gaming')) return Gamepad2;
    if (cat.includes('wearable')) return Watch;
    if (cat.includes('monitor')) return Tv;
    if (cat.includes('camera')) return Camera;
    if (cat.includes('appliance')) return Home;
    return Package;
  };

  return (
    <Card
      title="Recent Returns Triage"
      action={
        <button
          onClick={onOpenIntake}
          className="text-xs font-semibold text-[#073E2E] hover:underline"
        >
          + Ingest Return
        </button>
      }
    >
      {/* Active Filter Chips */}
      {(pathwayFilter || defectFilter || searchTerm) && (
        <div className="flex flex-wrap items-center gap-2 mb-3 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Active Filters:
          </span>

          {pathwayFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
              Pathway: {pathwayFilter}
              <button onClick={onClearPathwayFilter} className="hover:text-emerald-950">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {defectFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
              Defect: {defectFilter}
              <button onClick={onClearDefectFilter} className="hover:text-amber-950">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-medium">
              Keyword: &quot;{searchTerm}&quot;
              <button onClick={() => setSearchTerm('')} className="hover:text-slate-950">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={() => {
              onClearPathwayFilter && onClearPathwayFilter();
              onClearDefectFilter && onClearDefectFilter();
              setSearchTerm('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search products, ID, category, or defects..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#073E2E] focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 py-2 px-3 focus:outline-none focus:border-[#073E2E]"
          >
            <option value="all">All Product Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 py-2 px-3 focus:outline-none focus:border-[#073E2E]"
          >
            <option value="all">All Statuses</option>
            <option value="Recovered">Recovered</option>
            <option value="In progress">In progress</option>
            <option value="Needs human review">Needs review</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : filteredData.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No return items matching active filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 text-[10px] font-mono">
                <th className="py-2.5 px-3">Date / ID</th>
                <th className="py-2.5 px-3">Product Model</th>
                <th className="py-2.5 px-3">Defect Summary</th>
                <th className="py-2.5 px-3">Pathway</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((item) => {
                const CategoryIcon = getCategoryIcon(item.category);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectReturn && onSelectReturn(item)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Date & ID */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-900 block text-xs group-hover:text-[#073E2E] transition-colors">
                        {item.id}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.received_date}</span>
                    </td>

                    {/* Brand & Model */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full ${getBrandColor(
                            item.brand_model
                          )} flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm`}
                        >
                          {getBrandInitial(item.brand_model)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs group-hover:text-[#073E2E] transition-colors">
                            {item.brand_model}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <CategoryIcon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {item.category} • SKU: {item.product_id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Defect */}
                    <td className="py-3 px-3">
                      <span className="text-slate-600 block line-clamp-1 max-w-xs text-xs">
                        {item.defect_summary}
                      </span>
                    </td>

                    {/* Pathway */}
                    <td className="py-3 px-3">
                      <PathwayBadge pathway={item.recommended_pathway} />
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono">
                        <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#073E2E] h-full rounded-full"
                            style={{ width: `${item.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {item.confidence}%
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-right">
                      <StatusChip status={item.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
        <span>
          Showing {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
          {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} returns
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 py-0.5 font-mono font-bold text-slate-800">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
