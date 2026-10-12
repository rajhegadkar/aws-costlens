import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Terminal,
  Lock,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { AuthStatus } from '../../shared/types.js';
import { refreshPermissions } from '../api/client.js';

interface SettingsPageProps {
  authStatus: AuthStatus | null;
  onProfileChange: (profile: string, demoMode?: boolean) => void;
  onRefreshAuth: (newStatus: AuthStatus) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  authStatus,
  onProfileChange,
  onRefreshAuth
}) => {
  const [testing, setTesting] = useState(false);
  const [copiedPolicy, setCopiedPolicy] = useState(false);

  const handleTestPermissions = async () => {
    setTesting(true);
    try {
      const updated = await refreshPermissions();
      onRefreshAuth(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  const sampleReadOnlyPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCostExplorerReadOnly",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetTags",
        "ce:GetReservationUtilization",
        "ce:GetSavingsPlansUtilization",
        "ce:GetSavingsPlansCoverage"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowMetadataReadEnrichment",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "rds:DescribeDBInstances",
        "s3:ListBuckets"
      ],
      "Resource": "*"
    }
  ]
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sampleReadOnlyPolicy);
    setCopiedPolicy(true);
    setTimeout(() => setCopiedPolicy(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          AWS Connection & Security
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Verify credentials, inspect read-only safety guarantees, and configure local profiles.
        </p>
      </div>

      {/* Permission Checker Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Live AWS Read-Only Permission Checker
              </h2>
              <span className="text-xs text-slate-400">
                Audited upon startup and verifiable on-demand
              </span>
            </div>
          </div>

          <button
            onClick={handleTestPermissions}
            disabled={testing}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-brand-500' : ''}`} />
            <span>Re-Check Permissions</span>
          </button>
        </div>

        {/* Status Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {authStatus?.isAuthenticated ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                AWS Credentials Detected
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {authStatus?.isAuthenticated ? 'ACTIVE' : 'DEMO MODE'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {authStatus?.accountId ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                AWS Account Identified (STS)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {authStatus?.accountId ? authStatus.accountId : '123456789012 (Demo)'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {authStatus?.permissions.costExplorer === 'accessible' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                AWS Cost Explorer Accessible
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {authStatus?.permissions.costExplorer === 'accessible' ? 'GRANTED' : 'SIMULATED'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Read-Only Code Guard
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ENABLED & PERMANENT
            </span>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Active Operation Mode
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => onProfileChange('default', true)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              authStatus?.isDemoMode
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                🎯 Demo / Mock Mode
              </span>
              {authStatus?.isDemoMode && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Explores all dashboard features, graphs, drill-downs, and anomalies using safe simulated data without connecting to AWS or incurring API query fees.
            </p>
          </div>

          <div
            onClick={() => onProfileChange('default', false)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              !authStatus?.isDemoMode
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                ⚡ Live AWS Credentials
              </span>
              {!authStatus?.isDemoMode && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Connects directly to your live AWS account using standard credentials (<code className="font-mono">~/.aws/credentials</code>, environment variables, or SSO).
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Minimum IAM Policy */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recommended Minimum Read-Only IAM Policy
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Although this application enforces its own read-only safety guard, following the principle of least privilege in AWS is best practice.
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {copiedPolicy ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPolicy ? 'Copied!' : 'Copy Policy'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
          {sampleReadOnlyPolicy}
        </pre>
      </div>

      {/* CLI Setup Instructions */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-brand-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Connecting via AWS CLI
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          To connect your live AWS account, configure credentials on your local machine using the AWS CLI or by setting environment variables in <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.env</code>:
        </p>
        <div className="p-3.5 rounded-2xl bg-slate-900 text-amber-400 font-mono text-xs">
          aws configure
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Enter your AWS Access Key ID, Secret Access Key, and default region (<code className="font-mono">us-east-1</code>). Restart or refresh this application to connect.
        </div>
      </div>
    </div>
  );
};
