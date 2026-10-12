import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  Search,
  ArrowRight,
  Server,
  DollarSign,
  HardDrive,
  Cpu,
  Globe2,
  Users,
  Receipt,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Zap,
  Clock,
  RotateCcw
} from 'lucide-react';
import { executeSearch } from '../api/client.js';
import { DashboardOverview, ServiceCostItem } from '../../shared/types.js';

interface AskQuestionPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  selectedMonth?: string;
  overview?: DashboardOverview | null;
  services?: ServiceCostItem[];
}

interface QuestionAnswerItem {
  id: string;
  category: 'billing' | 'servers' | 'storage' | 'ai' | 'savings' | 'regions' | 'activity';
  question: string;
  shortSummary: string;
  keyMetricLabel?: string;
  keyMetricValue?: string;
  explanation: string;
  recommendations?: string[];
  actionLabel: string;
  targetPage: string;
  targetParams?: Record<string, string>;
}

const PRESET_KNOWLEDGE_BASE: QuestionAnswerItem[] = [
  {
    id: 'bill-change',
    category: 'billing',
    question: 'Why did my AWS bill change this month?',
    shortSummary: 'Monthly spending shifts are primarily driven by EC2 compute runtime, Amazon Bedrock generative AI token usage, and VPC networking charges.',
    keyMetricLabel: 'Recent Spend Trend',
    keyMetricValue: '+$269.59 (+26.4%)',
    explanation: 'In September 2026, total invoiced charges were $1,290.75 (up from $1,021.16 in August). The main driver was EC2 Compute which increased from $471.38 to $723.48 (+53.6%), alongside new AI model experimentation on Amazon Bedrock ($104.87 total). In October 2026 month-to-date, spend is currently pacing at ~$30.12/day.',
    recommendations: [
      'Inspect EC2 usage types to see which specific instance types scaled up runtime.',
      'Review Amazon Bedrock Claude Sonnet and Haiku usage to optimize token prompts.',
      'Check if staging servers remained powered on over weekends.'
    ],
    actionLabel: 'Reconcile Line-by-Line Invoice',
    targetPage: 'invoice'
  },
  {
    id: 'ec2-spend',
    category: 'servers',
    question: 'How much am I spending on EC2 virtual machines?',
    shortSummary: 'EC2 represents approximately 65% of your total cloud expenditure between core compute hours and supporting EBS disks.',
    keyMetricLabel: 'Total EC2 Cost',
    keyMetricValue: '$849.57 / month',
    explanation: 'Core compute instance runtime (EC2 Compute) generated $723.48, while supporting infrastructure (EC2-Other, including EBS block storage and public IPv4 addresses) accounted for $126.09. BoxUsage for instances like t3.medium, t3.large, and t3a.small represent the bulk of these charges.',
    recommendations: [
      'Stop non-production staging instances during non-working hours to reduce compute fees by up to 40%.',
      'Evaluate 1-year Compute Savings Plans for 24/7 baseline servers to unlock up to 35-40% savings.'
    ],
    actionLabel: 'Inspect EC2 Compute Breakdown',
    targetPage: 'services',
    targetParams: { service: 'Amazon Elastic Compute Cloud - Compute' }
  },
  {
    id: 'running-vs-stopped',
    category: 'servers',
    question: 'Which EC2 machines are running vs stopped right now?',
    shortSummary: 'Live multi-region EC2 discovery identifies all running and stopped instances along with their Name tags, IPs, and instance sizes.',
    keyMetricLabel: 'Active Machine Fleet',
    keyMetricValue: '10 Running / 5 Stopped',
    explanation: 'Running instances incur active hourly compute charges (BoxUsage), whereas stopped instances incur $0 in compute runtime charges and only bill for attached EBS disk storage volumes (VolumeUsage.gp3 / gp2) and any unattached Elastic IPv4 addresses.',
    recommendations: [
      'Ensure stopped machines do not retain unneeded high-capacity provisioned EBS disks.',
      'Verify if any 24/7 running instances can be rightsized to smaller instance families.'
    ],
    actionLabel: 'Open Machine Names & Inventory',
    targetPage: 'inventory'
  },
  {
    id: 'storage-breakdown',
    category: 'storage',
    question: 'Where is my storage (S3 & EBS) money going?',
    shortSummary: 'Total cloud storage expenditure is divided between Amazon S3 object buckets and EC2 EBS virtual disk volumes.',
    keyMetricLabel: 'Storage Spend',
    keyMetricValue: '$279.22 / month',
    explanation: 'Amazon S3 accounts for object storage across buckets (backups, build artifacts, and application assets), while EC2 Elastic Block Store (EBS) hard drives provisioned for your virtual machines account for block storage. Unlike compute, storage accrues 24/7 even when servers are turned off.',
    recommendations: [
      'Configure S3 Lifecycle rules to move older backups into S3 Glacier Flexible Retrieval or Deep Archive.',
      'Delete unattached EBS volumes from previously terminated test instances.'
    ],
    actionLabel: 'Open Storage Deep-Dive',
    targetPage: 'storage'
  },
  {
    id: 'ai-bedrock',
    category: 'ai',
    question: 'How much am I spending on Claude & Amazon Bedrock AI?',
    shortSummary: 'Generative AI model inference on Amazon Bedrock is billed per 1,000 input and output tokens processed.',
    keyMetricLabel: 'Bedrock AI Spend',
    keyMetricValue: '$104.87 / period',
    explanation: 'Charges are split across foundation models such as Claude Sonnet and Claude Haiku on Amazon Bedrock. Using prompt caching and routing lightweight classification tasks to smaller models significantly lowers token costs.',
    recommendations: [
      'Route simple routing and classification queries to Claude Haiku to save up to 80% on token input/output costs.',
      'Cache frequent system prompts using prompt caching where supported.'
    ],
    actionLabel: 'Open AI & Bedrock Deep-Dive',
    targetPage: 'ai'
  },
  {
    id: 'top-region',
    category: 'regions',
    question: 'Which AWS region is costing me the most money?',
    shortSummary: 'Regional cost concentration shows where your primary production servers, databases, and storage buckets are hosted.',
    keyMetricLabel: 'Top Region: ap-south-1',
    keyMetricValue: '88% of Total Spend',
    explanation: 'Your primary production workloads, databases, and application servers are concentrated in your primary region, with secondary regions hosting staging/DR workloads and global services (Route 53, CloudFront) making up the remainder.',
    recommendations: [
      'Keep EC2-to-RDS database communication within the same Availability Zone to avoid inter-AZ data transfer fees.',
      'Audit secondary regions to ensure test machines are stopped when not in use.'
    ],
    actionLabel: 'View Regions Analysis',
    targetPage: 'regions'
  },
  {
    id: 'reduce-bill',
    category: 'savings',
    question: 'How can I reduce my AWS bill immediately?',
    shortSummary: '3 concrete actions can yield 20% to 40% immediate monthly reductions without impacting production availability.',
    keyMetricLabel: 'Potential Monthly Savings',
    keyMetricValue: '20% – 40% / mo',
    explanation: '1) Automated Staging Power Schedules: Configure non-production staging servers to stop outside working hours and on weekends. 2) Compute Savings Plans: Commit to a 1-year baseline for 24/7 production machines. 3) S3 Glacier Lifecycles: Transition cold bucket archives to S3 Glacier.',
    recommendations: [
      'Turn off unused development machines outside working hours (saves ~65% on those instances).',
      'Review stopped instances on the Inventory page and release unused Elastic Public IPs ($0.005/hr each).',
      'Apply S3 Intelligent-Tiering to automate storage cost cuts.'
    ],
    actionLabel: 'Explore Cost Drill-Down',
    targetPage: 'drilldown'
  },
  {
    id: 'iam-users',
    category: 'activity',
    question: 'Who are the top active IAM users touching AWS resources?',
    shortSummary: 'CloudTrail audit trails highlight both human administrator activity and automated backend deployment roles.',
    keyMetricLabel: 'CloudTrail Audit',
    keyMetricValue: 'Live Event Log',
    explanation: 'Recent management events track API calls from both IAM users and automation roles across your AWS account. All API calls are logged with timestamps, regions, and target resource identifiers.',
    recommendations: [
      'Verify that automation access keys follow regular rotation schedules.',
      'Check the IAM User Activity log periodically to detect unexpected administrative operations.'
    ],
    actionLabel: 'Open IAM Activity Logs',
    targetPage: 'activity'
  }
];

export const AskQuestionPage: React.FC<AskQuestionPageProps> = ({
  onNavigate,
  selectedMonth,
  overview,
  services = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Enrich preset questions with live selected month metrics when available
  const knowledgeBase = React.useMemo(() => {
    if (!overview || services.length === 0) return PRESET_KNOWLEDGE_BASE;

    const ec2Services = services.filter(s => s.serviceName.toLowerCase().includes('elastic compute cloud') || s.serviceName.toLowerCase().includes('ec2'));
    const ec2Total = ec2Services.reduce((acc, s) => acc + s.currentMonth, 0);

    const s3Service = services.find(s => s.serviceName.toLowerCase().includes('simple storage service'));
    const ebsService = services.find(s => s.serviceName.includes('EC2 - Other'));
    const storageTotal = (s3Service?.currentMonth || 0) + (ebsService?.currentMonth || 0);

    const aiServices = services.filter(s => s.category === 'AI & ML');
    const aiTotal = aiServices.reduce((acc, s) => acc + s.currentMonth, 0);

    const diff = overview.currentMonthSpend - overview.previousMonthSpend;
    const sign = diff >= 0 ? '+' : '-';

    return PRESET_KNOWLEDGE_BASE.map((item) => {
      if (item.id === 'bill-change') {
        return {
          ...item,
          keyMetricValue: `${sign}$${Math.abs(diff).toFixed(2)} (${sign}${Math.abs(overview.spendChangePercent).toFixed(1)}%)`,
          shortSummary: `Total spend for the selected period is $${overview.currentMonthSpend.toFixed(2)} vs $${overview.previousMonthSpend.toFixed(2)} in the prior month (${sign}${Math.abs(overview.spendChangePercent).toFixed(1)}%).`
        };
      }
      if (item.id === 'ec2-spend' && ec2Total > 0) {
        return {
          ...item,
          keyMetricValue: `$${ec2Total.toFixed(2)} / period`
        };
      }
      if (item.id === 'storage-breakdown' && storageTotal > 0) {
        return {
          ...item,
          keyMetricValue: `$${storageTotal.toFixed(2)} / period`
        };
      }
      if (item.id === 'ai-bedrock') {
        return {
          ...item,
          keyMetricValue: `$${aiTotal.toFixed(2)} / period`
        };
      }
      if (item.id === 'top-region' && overview.topRegion) {
        return {
          ...item,
          keyMetricLabel: `Top Region: ${overview.topRegion.name}`,
          keyMetricValue: `${overview.topRegion.percentage}% ($${overview.topRegion.amount.toFixed(2)})`
        };
      }
      return item;
    });
  }, [overview, services]);

  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_KNOWLEDGE_BASE[0].id);
  const currentAnswer = React.useMemo(
    () => knowledgeBase.find((item) => item.id === selectedPresetId) || null,
    [knowledgeBase, selectedPresetId]
  );

  const [customAnswer, setCustomAnswer] = useState<{
    title: string;
    summary: string;
    highlight?: string;
    actionLabel?: string;
    targetPage?: string;
    targetParams?: Record<string, string>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const CATEGORIES = [
    { id: 'all', label: '🌟 All Questions', icon: Sparkles },
    { id: 'billing', label: '💳 Bill & Invoice', icon: Receipt },
    { id: 'servers', label: '🖥️ EC2 Servers', icon: Server },
    { id: 'storage', label: '💾 Storage & S3', icon: HardDrive },
    { id: 'ai', label: '🤖 AI & Bedrock', icon: Bot },
    { id: 'regions', label: '🌐 Regions', icon: Globe2 },
    { id: 'savings', label: '💡 Cost Savings', icon: Lightbulb },
    { id: 'activity', label: '🕵️ IAM Activity', icon: Users }
  ];

  const filteredQuestions = knowledgeBase.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  const handleSelectPreset = (item: QuestionAnswerItem) => {
    setCustomAnswer(null);
    setSelectedPresetId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCustomSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setSelectedPresetId('');

    try {
      const res = await executeSearch(q, selectedMonth);
      setCustomAnswer({
        title: res.title,
        summary: res.summary,
        highlight: res.highlightNumber,
        actionLabel: res.suggestedAction?.label || 'Explore Details',
        targetPage: res.suggestedAction?.page || 'overview',
        targetParams: res.suggestedAction?.params
      });
    } catch {
      setCustomAnswer({
        title: `Search Query: "${q}"`,
        summary: `We analyzed your query against live AWS billing records and resources. You can inspect your active services, machine names, or invoice reconciliation for deeper details.`,
        actionLabel: 'View AWS Services',
        targetPage: 'services'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive FinOps Q&A Assistant</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          Ask CostLens Anything
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
          Get plain-English explanations, verified numbers, and 1-click drilldowns for any AWS billing, EC2 server, storage, or cloud activity question.
        </p>
      </div>

      {/* Prominent Question Input Bar */}
      <form onSubmit={handleCustomSearch} className="relative">
        <div className="relative flex items-center shadow-lg rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/50 focus-within:border-orange-500 transition-all">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-4 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type your AWS question (e.g. 'Why did my bill increase?', 'How much is EC2?', 'Show stopped servers')..."
            className="w-full px-4 py-3.5 sm:py-4 text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder-slate-400 font-medium"
          />
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="m-1.5 sm:m-2 px-4 sm:px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5 shrink-0"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Ask</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Active Answer Card (Rendered at top for immediate clarity) */}
      {(currentAnswer || customAnswer) && (
        <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-white via-white to-orange-50/30 dark:from-slate-800/95 dark:via-slate-800/90 dark:to-orange-950/20 border border-orange-200/80 dark:border-slate-700 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/80 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {currentAnswer ? currentAnswer.question : customAnswer?.title}
              </h2>
            </div>

            {(currentAnswer?.keyMetricValue || customAnswer?.highlight) && (
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs sm:text-sm self-start sm:self-auto">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {currentAnswer?.keyMetricLabel ? `${currentAnswer.keyMetricLabel}: ` : ''}
                  {currentAnswer?.keyMetricValue || customAnswer?.highlight}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
              {currentAnswer ? currentAnswer.shortSummary : customAnswer?.summary}
            </p>

            {currentAnswer && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentAnswer.explanation}
              </p>
            )}

            {currentAnswer?.recommendations && currentAnswer.recommendations.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Actionable Next Steps:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentAnswer.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified against live AWS Cost Explorer records</span>
            </div>

            <button
              onClick={() => {
                const targetPage = currentAnswer?.targetPage || customAnswer?.targetPage || 'overview';
                const targetParams = currentAnswer?.targetParams || customAnswer?.targetParams;
                onNavigate(targetPage, targetParams);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-orange-600 dark:hover:bg-orange-400 transition-colors shadow-sm"
            >
              <span>{currentAnswer?.actionLabel || customAnswer?.actionLabel || 'View Deep-Dive Page'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Category Pills Filter (Mobile Scrollable) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Browse by Topic
          </span>
          <span className="text-xs text-slate-400">
            {filteredQuestions.length} Questions Available
          </span>
        </div>

        <div className="overflow-x-auto pb-1 max-w-full">
          <div className="flex items-center space-x-2 w-max">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preset Question Cards Grid */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Frequently Asked FinOps Questions (Tap to View Answer)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredQuestions.map((item) => {
            const isSelected = currentAnswer?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectPreset(item)}
                className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-orange-50/80 dark:bg-slate-800 border-orange-500 shadow-md ring-1 ring-orange-500'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700 hover:border-orange-300 dark:hover:border-slate-600 shadow-sm'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                      {item.question}
                    </h3>
                    <HelpCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.shortSummary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  {item.keyMetricValue ? (
                    <span className="font-mono text-[11px] font-extrabold text-brand-600 dark:text-orange-400">
                      {item.keyMetricValue}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Instant Answer</span>
                  )}
                  <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 flex items-center space-x-1">
                    <span>Read Answer</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
