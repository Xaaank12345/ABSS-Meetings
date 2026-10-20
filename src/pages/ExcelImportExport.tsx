import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Department, Meeting, ActionItem, ProposedAgendaItem } from '../types';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { createMeeting, createActionItem, saveProposedItem } from '../services/db';

interface ExcelImportExportProps {
  meetings: Meeting[];
  departments: Department[];
  actionItems: ActionItem[];
  proposedItems: ProposedAgendaItem[];
  onRefreshData: () => Promise<void>;
}

export const ExcelImportExport: React.FC<ExcelImportExportProps> = ({
  meetings,
  departments,
  actionItems,
  proposedItems,
  onRefreshData
}) => {
  const [parsedSheets, setParsedSheets] = useState<{ sheetName: string; rows: any[] }[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus('Reading Excel workbook...');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const results: { sheetName: string; rows: any[] }[] = [];
        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          results.push({ sheetName, rows: data });
        });

        setParsedSheets(results);
        setSelectedSheetIndex(0);
        setIsProcessing(false);
        setImportStatus(`Loaded ${results.length} worksheets: ${wb.SheetNames.join(', ')}`);
      } catch (err) {
        console.error(err);
        setImportStatus('Failed to parse Excel file.');
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Commit Parsed Rows to Firestore as Meetings & Actions
  const handleImportSheet = async () => {
    if (parsedSheets.length === 0) return;
    const currentSheet = parsedSheets[selectedSheetIndex];
    setIsProcessing(true);
    setImportStatus(`Importing records from ${currentSheet.sheetName}...`);

    try {
      // Create new Meeting record for this sheet
      const meetingTitle = `ABSS Management Meeting — ${currentSheet.sheetName}`;
      const newMeeting = await createMeeting({
        title: meetingTitle,
        meetingDate: '2026-10-16', // Fallback or parsed from sheet
        startTime: '10:00',
        endTime: '13:00',
        venue: 'Main Boardroom',
        chairperson: 'Engr. Ahmed Al-Saeed',
        organizerId: 'user-admin',
        organizerName: 'Executive Secretariat',
        meetingType: 'Management',
        lifecycleStatus: 'Completed',
        submissionDeadline: '2026-10-14 18:00',
        participatingDepartmentIds: departments.map((d) => d.id),
        attendees: [
          { name: 'Engr. Ahmed Al-Saeed', designation: 'Managing Director', present: true },
          { name: 'Shiraz Khan', designation: 'CFO', present: true }
        ],
        objectives: `Historical meeting records imported from sheet ${currentSheet.sheetName}.`,
        createdBy: 'user-admin'
      });

      // Parse sample rows as action items
      let count = 0;
      for (let i = 1; i < currentSheet.rows.length; i++) {
        const row = currentSheet.rows[i];
        if (Array.isArray(row) && row.length > 2 && row[1]) {
          const topic = String(row[1] || `Item ${i}`);
          const desc = String(row[2] || row[1] || 'Imported action details');
          const owner = String(row[3] || 'Department Lead');

          await createActionItem({
            originalMeetingId: newMeeting.id,
            originalMeetingDate: newMeeting.meetingDate,
            departmentId: 'dept-ops',
            departmentName: 'Operations & Logistics',
            topic,
            description: desc,
            responsiblePerson: owner,
            assignedDate: newMeeting.meetingDate,
            dueDate: '2026-11-15',
            priority: 'Medium',
            status: 'In Progress',
            createdBy: 'user-admin'
          });
          count++;
        }
      }

      await onRefreshData();
      setIsProcessing(false);
      setImportStatus(`Successfully migrated ${currentSheet.sheetName} with ${count} action records to Firestore!`);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      setImportStatus('Error importing sheet records.');
    }
  };

  // Export All Meetings to Excel
  const handleExportMeetings = () => {
    const data = meetings.map((m) => ({
      'Meeting ID': m.id,
      'Meeting Title': m.title,
      'Date': m.meetingDate,
      'Time': `${m.startTime} - ${m.endTime}`,
      'Venue': m.venue,
      'Chairperson': m.chairperson,
      'Lifecycle Status': m.lifecycleStatus,
      'Submission Deadline': m.submissionDeadline,
      'Participating Departments': m.participatingDepartmentIds.length
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Meetings Register');
    XLSX.writeFile(wb, 'ABSS_All_Meetings.xlsx');
  };

  // Export Action Tracker to Excel
  const handleExportActions = () => {
    const data = actionItems.map((a) => ({
      'Action ID': a.id,
      'Original Meeting Date': a.originalMeetingDate,
      'Department': a.departmentName,
      'Topic': a.topic,
      'Action Commitment': a.description,
      'Responsible Person': a.responsiblePerson,
      'Assigned Date': a.assignedDate,
      'Due Date': a.dueDate,
      'Revised Due Date': a.revisedDueDate || 'N/A',
      'Priority': a.priority,
      'Status': a.status,
      'Progress Notes': a.progressNotes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Action Tracker');
    XLSX.writeFile(wb, 'ABSS_Action_Tracker.xlsx');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg">
        <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
          Data Integration & Migration Hub
        </span>
        <h1 className="text-xl font-bold text-[#F5F5F7] mt-0.5">
          Excel (XLSX) Import & Export Center
        </h1>
        <p className="text-xs text-[#A1A1B5] mt-1">
          Seamlessly migrate existing MEETING MINUTES ABSS workbooks (sheets: 28th July 26_, 06th August 26, 16th October 26) and export live data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Wizard */}
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#30303D]">
            <Upload className="w-4 h-4 text-[#8B5CF6]" />
            <h2 className="text-sm font-bold text-[#F5F5F7] uppercase tracking-wider">
              1. Import Existing Excel Workbook
            </h2>
          </div>

          <div className="border-2 border-dashed border-[#30303D] hover:border-[#8B5CF6]/60 rounded-xl p-6 text-center space-y-3 transition-colors bg-[#15151C]/60">
            <FileSpreadsheet className="w-10 h-10 text-[#8B5CF6] mx-auto opacity-80" />
            <div className="text-xs text-[#F5F5F7]">
              Select your <strong>MEETING MINUTES ABSS.xlsx</strong> file to parse
            </div>
            <label className="inline-block px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer shadow transition-colors">
              <span>Choose XLSX File</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <div className="p-3 bg-[#15151C] border border-[#30303D] rounded-lg text-xs text-[#22C55E] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {parsedSheets.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#F5F5F7] block">
                Select Worksheet to Preview & Import:
              </label>
              <div className="flex flex-wrap gap-2">
                {parsedSheets.map((s, idx) => (
                  <button
                    key={s.sheetName}
                    onClick={() => setSelectedSheetIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      selectedSheetIndex === idx
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#15151C] border-[#30303D] text-[#A1A1B5] hover:text-white'
                    }`}
                  >
                    {s.sheetName} ({s.rows.length} rows)
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleImportSheet}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:opacity-95 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {isProcessing ? 'Importing...' : `Import "${parsedSheets[selectedSheetIndex]?.sheetName}" to Firestore`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export Center */}
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#30303D]">
            <Download className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-sm font-bold text-[#F5F5F7] uppercase tracking-wider">
              2. Export Data to Excel
            </h2>
          </div>

          <p className="text-xs text-[#A1A1B5] leading-relaxed">
            Download comprehensive Excel files containing clean formatted tables for board packs, regulatory submissions, or offline auditing.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleExportMeetings}
              className="w-full p-4 rounded-xl bg-[#15151C] border border-[#30303D] hover:border-[#22C55E]/50 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div>
                <div className="text-xs font-bold text-[#F5F5F7] group-hover:text-[#4ADE80]">
                  Export All Meetings Register (.xlsx)
                </div>
                <div className="text-[11px] text-[#A1A1B5] mt-0.5">
                  Full list of {meetings.length} company meetings with attendee and schedule metadata.
                </div>
              </div>
              <Download className="w-4 h-4 text-[#22C55E]" />
            </button>

            <button
              onClick={handleExportActions}
              className="w-full p-4 rounded-xl bg-[#15151C] border border-[#30303D] hover:border-[#8B5CF6]/50 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div>
                <div className="text-xs font-bold text-[#F5F5F7] group-hover:text-[#C4B5FD]">
                  Export Complete Action Tracker (.xlsx)
                </div>
                <div className="text-[11px] text-[#A1A1B5] mt-0.5">
                  Download all {actionItems.length} active and completed action items with deadlines and status.
                </div>
              </div>
              <Download className="w-4 h-4 text-[#8B5CF6]" />
            </button>
          </div>
        </div>
      </div>

      {/* Sheet Preview Table */}
      {parsedSheets.length > 0 && (
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#F5F5F7] uppercase tracking-wider">
              Preview of Worksheet: {parsedSheets[selectedSheetIndex]?.sheetName}
            </h3>
            <span className="text-[11px] text-[#A1A1B5]">
              First 10 rows shown
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#30303D]">
              <tbody>
                {parsedSheets[selectedSheetIndex]?.rows.slice(0, 10).map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx === 0 ? 'bg-[#242432] font-bold text-[#F5F5F7]' : 'border-t border-[#30303D]/60'}>
                    {Array.isArray(row) && row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 border-r border-[#30303D]/60 truncate max-w-xs">
                        {String(cell || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
