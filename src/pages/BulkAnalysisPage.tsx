import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Brain, Download, Trash2, 
  CheckCircle, AlertCircle, BarChart3, Users,
  Filter, Search, ArrowUpDown, Eye, X,
  Loader2, Play, Pause, RotateCcw, FileX,
  Star, Award, TrendingUp, Clock, ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { 
  analyzeBulkCVs, 
  exportResultsToCSV, 
  exportDetailedSummaries,
  downloadCSV, 
  downloadTextFile,
  getAnalysisStats,
  filterResultsByScore,
  getTopCandidates
} from '../utils/bulkAnalysis';

interface AnalysisResult {
  fileName: string;
  matchScore: number;
  summary: string;
  tags: string[];
  status: 'completed' | 'error';
  error?: string;
  extractedTextLength?: number;
  pageCount?: number;
  wordCount?: number;
  cvFile?: File; // Store the original file for top candidates
}

const BulkAnalysisPage: React.FC = () => {
  // ... rest of the component code ...
};

export default BulkAnalysisPage;