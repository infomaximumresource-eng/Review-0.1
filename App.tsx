
import React, { useState } from 'react';
import { AnalysisResult, FileData } from './types';
import { analyzeDocuments } from './geminiService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  FileText, Search, AlertTriangle, CheckCircle, XCircle, CreditCard, 
  Activity, ShieldCheck, Loader2, Trash2, Info, ArrowDownCircle, 
  Download, RefreshCw, Landmark, TrendingDown, MessageSquare, ExternalLink,
  ShieldAlert, UserCheck, Wallet
} from 'lucide-react';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [preStudyNotes, setPreStudyNotes] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files) as File[];
      selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            base64: event.target?.result as string
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetAnalysis = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setPreStudyNotes('');
  };

  const calculateAvgInflow = () => {
    const breakdown = result?.salaryTally?.monthlyBreakdown || [];
    if (breakdown.length === 0) return 0;
    const total = breakdown.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
    return total / breakdown.length;
  };

  const generatePDF = () => {
    if (!result) return;
    try {
      const doc = new jsPDF();
      const primaryColor = [79, 70, 229];
      const accentColor = [15, 23, 42];
      const dangerColor = [220, 38, 38];

      const decision = String(result.conclusion?.decision || 'REJECT');
      const repayment = String(result.conclusion?.monthlyRepayment || 'RM 0.00');
      const avgInflowStr = `RM ${calculateAvgInflow().toLocaleString()}`;
      const cardStatus = result.riskAssessment?.hasDebitCardUsage ? 'ACTIVE' : 'NO USAGE FOUND';
      const debtRisk = (result.hiddenLoans?.length || 0) > 0 ? 'HIGH' : 'LOW';
      const riskRatio = String(result.conclusion?.riskRewardRatio || 'N/A');

      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ELITE FINANCIAL AUDIT REPORT', 14, 22);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`REF: LW-CORE-AUDIT-${new Date().getTime()}`, 14, 32);
      doc.text(`UNDERWRITER ID: AI-ENGINE-PRO`, 14, 37);

      const isApprove = decision.toLowerCase() === 'approve';
      doc.setFillColor(isApprove ? 5 : 220, isApprove ? 150 : 38, isApprove ? 105 : 38);
      doc.roundedRect(14, 50, 182, 25, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('AUDIT VERDICT', 20, 58);
      doc.setFontSize(18);
      doc.text(decision.toUpperCase(), 20, 68);

      doc.text('MONTHLY REPAYMENT', 120, 58);
      doc.setFontSize(16);
      doc.text(repayment, 120, 68);

      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary of Financial Standing:', 14, 85);
      
      (doc as any).autoTable({
        startY: 90,
        head: [['Category', 'Calculated Value', 'Risk Assessment']],
        body: [
          ['Avg Monthly Inflow', avgInflowStr, 'Verified'],
          ['ATM Card Presence', cardStatus, result.riskAssessment?.hasDebitCardUsage ? 'Pass' : 'Critical'],
          ['Hidden Debt Risk', debtRisk, `${result.hiddenLoans?.length || 0} Entities`],
          ['Risk Reward Ratio', riskRatio, 'Engine Rated']
        ],
        headStyles: { fillColor: primaryColor },
        styles: { fontSize: 9 }
      });

      if (result.hiddenLoans && result.hiddenLoans.length > 0) {
        doc.setFontSize(11);
        doc.text('Verified Hidden Lenders & Private Inflows:', 14, (doc as any).lastAutoTable.finalY + 10);
        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable.finalY + 15,
          head: [['Lender Entity', 'Search Verification Details', 'Amount']],
          body: result.hiddenLoans.map((l:any) => [
            String(l.probableLender || 'Unknown'), 
            String(l.searchVerification || l.description || 'No data'), 
            `RM ${Number(l.amount || 0).toLocaleString()}`
          ]),
          headStyles: { fillColor: dangerColor },
          styles: { fontSize: 8 }
        });
      }

      doc.setFontSize(11);
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('Audit Conclusion & Logic:', 14, finalY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const explanation = String(result.conclusion?.explanation || 'Detailed analysis not generated.');
      const splitExplanation = doc.splitTextToSize(explanation, 180);
      doc.text(splitExplanation, 14, finalY + 7);

      doc.save(`Financial_Audit_${new Date().getTime()}.pdf`);
    } catch (e) {
      console.error("PDF Export failed:", e);
      alert("Failed to export PDF. Check console for details.");
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysisResult = await analyzeDocuments(files, preStudyNotes);
      setResult(analysisResult);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis failed. Ensure documents are valid and API key is set.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-[#f8fafc]">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">LendingWise <span className="text-indigo-600">Enterprise</span></h1>
          </div>
          {result && (
            <div className="flex gap-3">
              <button onClick={resetAnalysis} className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl transition-all border uppercase tracking-widest">
                <RefreshCw className="w-4 h-4" /> Reset
              </button>
              <button onClick={generatePDF} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-xl hover:bg-black transition-all uppercase tracking-widest">
                <Download className="w-4 h-4" /> Export Report
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sticky top-24 space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Underwriting Deck
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Pre-Study Context
                </label>
                <textarea 
                  value={preStudyNotes}
                  onChange={(e) => setPreStudyNotes(e.target.value)}
                  placeholder="Mention customer disclosures, special government aid, or suspicious lenders..."
                  className="w-full h-32 p-4 text-xs bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none resize-none font-medium"
                />
              </div>

              <label className="block w-full group cursor-pointer">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 group-hover:border-indigo-400 group-hover:bg-indigo-50/50 transition-all text-center">
                  <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black text-slate-800 block mb-1 uppercase tracking-widest">Upload Multi-Files</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">PDF or Image Formats</span>
                  <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </div>
              </label>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-600">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1.5 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              <button disabled={files.length === 0 || isAnalyzing} onClick={handleAnalyze} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 uppercase text-xs tracking-widest">
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                Run Full Audit
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {error && (
            <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-center gap-4 text-rose-700 font-black text-[10px] uppercase tracking-widest shadow-lg">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-black">Critical Error</p>
                <p className="font-medium opacity-80 mt-1 uppercase tracking-normal normal-case">{error}</p>
              </div>
            </div>
          )}

          {result ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`p-10 rounded-[2.5rem] border-4 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8 ${
                result.conclusion?.decision === 'Approve' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-rose-600 border-rose-400 text-white'
              }`}>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-3">Audit Outcome</h3>
                  <div className="flex items-center gap-6">
                    {result.conclusion?.decision === 'Approve' ? <CheckCircle className="w-16 h-16" /> : <XCircle className="w-16 h-16" />}
                    <span className="text-7xl font-black italic tracking-tighter">{result.conclusion?.decision?.toUpperCase() || 'REJECT'}</span>
                  </div>
                </div>
                <div className="bg-black/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 w-full md:w-auto min-w-[280px]">
                  <p className="text-[10px] font-black opacity-70 mb-2 uppercase tracking-widest">Commitment Installment</p>
                  <p className="text-5xl font-black tabular-nums">{result.conclusion?.monthlyRepayment || 'N/A'}</p>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10 text-[10px] font-black uppercase tracking-widest">
                    <span>Rate: {result.conclusion?.interestRate || 'N/A'}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[9px]">10 MO.</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                  <h4 className="font-black text-slate-800 flex items-center gap-3 mb-6 text-sm uppercase tracking-widest">
                    <ArrowDownCircle className="w-5 h-5 text-emerald-500" /> Inflow Profile
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(result.salaryTally?.monthlyBreakdown || []).map((b: any, i: number) => (
                      <div key={i} className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-50 transition-all hover:border-indigo-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{b.month}</p>
                        <p className="text-xl font-black text-slate-900">RM {(Number(b.amount) || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-6 bg-indigo-50/50 rounded-2xl text-[11px] text-indigo-900 font-medium leading-relaxed italic border border-indigo-100">
                    "{result.salaryTally?.remarks || 'Calculation verified against source.'}"
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                  <h4 className="font-black text-slate-800 flex items-center gap-3 mb-6 text-sm uppercase tracking-widest">
                    <Wallet className="w-5 h-5 text-amber-500" /> Card Usage Intelligence
                  </h4>
                  <div className={`p-6 rounded-2xl border-2 flex items-center justify-between ${result.riskAssessment?.hasDebitCardUsage ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div>
                      <p className="text-xs font-black uppercase text-slate-800 tracking-tighter">Physical ATM Check</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Status: {result.riskAssessment?.hasDebitCardUsage ? 'Verified' : 'Not Detected'}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${result.riskAssessment?.hasDebitCardUsage ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                      <CreditCard className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Risk Indicators</p>
                    {(result.riskAssessment?.details || []).map((d:string, i:number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                <h4 className="font-black text-slate-800 flex items-center gap-3 mb-8 text-sm uppercase tracking-widest">
                  <Landmark className="w-6 h-6 text-amber-600" /> Private Lender & Hidden Debt Discovery
                </h4>
                <div className="space-y-4">
                  {(result.hiddenLoans || []).map((loan: any, i: number) => (
                    <div key={i} className="p-6 bg-rose-50/50 border-2 border-rose-100 rounded-3xl transition-all hover:bg-rose-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white text-[10px] font-black">L</div>
                          <p className="text-xs font-black text-rose-800 uppercase tracking-tight">{loan.probableLender}</p>
                        </div>
                        <span className="font-black text-rose-700 text-sm">RM {(Number(loan.amount) || 0).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3">{loan.description}</p>
                      {loan.searchVerification && (
                        <div className="p-4 bg-white border border-rose-100 rounded-xl flex items-start gap-3">
                          <Search className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-rose-700 font-bold leading-tight italic">
                            Search Insight: "{loan.searchVerification}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!result.hiddenLoans || result.hiddenLoans.length === 0) && (
                    <div className="text-center py-16 text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-3xl">No High-Risk Private Debt Found</div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShieldCheck className="w-48 h-48 rotate-12" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-indigo-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Full Audit Logic Conclusion
                </h4>
                <div className="text-xl font-medium leading-relaxed italic opacity-95 mb-12 relative z-10">
                  "{result.conclusion?.explanation}"
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-10 border-t border-white/10 relative z-10">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1 text-white">Suggested Limit</p>
                    <p className="text-2xl font-black">{result.conclusion?.suggestedAmount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1 text-white">Risk Ratio</p>
                    <p className="text-2xl font-black italic">{result.conclusion?.riskRewardRatio || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1 text-white">Gov Servant</p>
                    <p className="text-2xl font-black">{result.governmentAid?.isGovServant ? 'YES' : 'NO'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1 text-white">Instalment</p>
                    <p className="text-2xl font-black">{result.conclusion?.monthlyRepayment}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            !isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-48 text-slate-200">
                <ShieldCheck className="w-32 h-32 mb-8 opacity-5 animate-pulse" />
                <p className="text-3xl font-black italic tracking-tighter uppercase opacity-10">Waiting for Financial Feed</p>
                <p className="text-[10px] mt-4 font-black opacity-30 uppercase tracking-[0.4em]">Proprietary Underwriting Engine v5.01</p>
              </div>
            )
          )}

          {isAnalyzing && (
            <div className="space-y-10">
              <div className="h-64 bg-slate-200/40 rounded-[2.5rem] animate-pulse"></div>
              <div className="h-[30rem] bg-slate-200/40 rounded-[2.5rem] animate-pulse"></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
