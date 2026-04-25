import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { useNavigationGuard } from '../context/NavigationGuardContext';
import api from '../api';
import {
  Save,
  Plus,
  X,
  Loader2,
  Briefcase,
  GraduationCap,
  Globe,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Phone as PhoneIcon,
  ArrowRightLeft,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { ConfirmDialog, UnsavedChangesDialog } from '../components/ConfirmDialog';
import { PageLoadingState } from '../components/PageLoadingState';

const UserIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="8 6 2 12 8 18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);

const CONTACT_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
];

const normalizeImportText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeSkillKey = (value) => normalizeImportText(value).toLowerCase();

const uniqueImportedValues = (values = []) => {
  const seen = new Set();
  const items = [];
  for (const value of values) {
    const text = normalizeImportText(value);
    const key = normalizeSkillKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(text);
  }
  return items;
};

const normalizeContactFieldForSave = (field) => {
  if (!field || typeof field !== 'object') return null;

  const label = normalizeImportText(field.label) || 'Custom Field';
  const value = normalizeImportText(field.value);
  if (!value) return null;

  const normalizedLabel = label.toLowerCase();
  let type = normalizeImportText(field.type).toLowerCase();
  if (normalizedLabel === 'phone') type = 'phone';
  else if (normalizedLabel === 'email') type = 'email';
  else if (['linkedin', 'github', 'website'].includes(normalizedLabel)) type = 'url';
  else if (!['text', 'email', 'phone', 'url'].includes(type)) type = 'text';

  return {
    id: Number.isFinite(Number(field.id)) ? Number(field.id) : undefined,
    label,
    value,
    type,
  };
};

const normalizeExperienceForSave = (item) => {
  if (!item || typeof item !== 'object') return null;
  const normalized = {
    title: normalizeImportText(item.title),
    company: normalizeImportText(item.company),
    duration: normalizeImportText(item.duration),
    description: normalizeImportText(item.description),
    start_date: normalizeImportText(item.start_date || item.start),
    end_date: normalizeImportText(item.end_date || item.end),
  };

  return Object.values(normalized).some(Boolean) ? normalized : null;
};

const normalizeEducationForSave = (item) => {
  if (!item || typeof item !== 'object') return null;
  const normalized = {
    degree: normalizeImportText(item.degree),
    institution: normalizeImportText(item.institution),
    major: normalizeImportText(item.major),
    start_year: normalizeImportText(item.start_year || item.start),
    end_year: normalizeImportText(item.end_year || item.end),
    year: normalizeImportText(item.year),
    gpa: normalizeImportText(item.gpa),
    gpa_scale: normalizeImportText(item.gpa_scale || item.scale),
  };

  return Object.values(normalized).some(Boolean) ? normalized : null;
};

const mergeImportedContactFields = (currentFields = [], resumeFields = []) => {
  const merged = [];
  const seen = new Set();
  for (const field of [...currentFields, ...resumeFields]) {
    if (!field || typeof field !== 'object') continue;
    const label = normalizeImportText(field.label) || 'Custom Field';
    const value = normalizeImportText(field.value);
    const fieldType = normalizeImportText(field.type).toLowerCase() || 'text';
    if (!value) continue;
    const key = `${label.toLowerCase()}::${fieldType}::${normalizeSkillKey(value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      ...field,
      label,
      value,
      type: fieldType,
    });
  }
  return merged;
};

const buildImportSkillSelectionState = (currentSkills = [], resumeSkills = []) => {
  const selection = {};
  for (const skill of uniqueImportedValues([...currentSkills, ...resumeSkills])) {
    selection[normalizeSkillKey(skill)] = true;
  }
  return selection;
};

const getGroupedImportSkills = (currentSkills = [], resumeSkills = [], selectionState = {}) => {
  const currentSet = new Set(uniqueImportedValues(currentSkills).map(normalizeSkillKey));
  const resumeSet = new Set(uniqueImportedValues(resumeSkills).map(normalizeSkillKey));
  const grouped = { matched: [], profile: [], resume: [] };

  for (const skill of uniqueImportedValues([...currentSkills, ...resumeSkills])) {
    const key = normalizeSkillKey(skill);
    const isSelected = selectionState[key] !== false;
    const inProfile = currentSet.has(key);
    const inResume = resumeSet.has(key);
    const entry = { skill, key, isSelected, inProfile, inResume };
    if (inProfile && inResume) grouped.matched.push(entry);
    else if (inProfile) grouped.profile.push(entry);
    else grouped.resume.push(entry);
  }

  return grouped;
};

const makeDefaultImportSelections = (diff = []) => diff.reduce((acc, item) => {
  acc[item.key] = item.recommended_action === 'use_resume';
  return acc;
}, {});

const formatPreviewValue = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Not set';
    return value.map((item, index) => {
      if (typeof item === 'string') return normalizeImportText(item);
      if (!item || typeof item !== 'object') return '';
      const experienceDuration = normalizeImportText(item.duration);
      const experienceStart = normalizeImportText(item.start_date || item.start);
      const experienceEnd = normalizeImportText(item.end_date || item.end);
      const experienceDurationFallback = (!experienceDuration && (experienceStart || experienceEnd))
        ? `Duration: ${experienceStart || 'N/A'} - ${experienceEnd || 'Present'}`
        : '';
      const pairs = [
        item.label && `Label: ${item.label}`,
        item.value && `Value: ${item.value}`,
        item.title && `Title: ${item.title}`,
        item.company && `Company: ${item.company}`,
        experienceDuration && `Duration: ${experienceDuration}`,
        experienceDurationFallback,
        item.description && `Description: ${item.description}`,
        item.degree && `Degree: ${item.degree}`,
        item.major && `Major: ${item.major}`,
        item.institution && `Institution: ${item.institution}`,
        item.start_year && `Start: ${item.start_year}`,
        item.end_year && `End: ${item.end_year}`,
        item.year && `Year: ${item.year}`,
        item.gpa && `GPA: ${item.gpa}`,
        item.gpa_scale && `Scale: ${item.gpa_scale}`,
      ].filter(Boolean);
      return pairs.length ? `${index + 1}. ${pairs.join(' | ')}` : '';
    }).filter(Boolean).join('\n');
  }

  const text = normalizeImportText(value);
  return text || 'Not set';
};

const parseEducationPreviewEntries = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        degree: normalizeImportText(item.degree),
        major: normalizeImportText(item.major),
        institution: normalizeImportText(item.institution),
        start: normalizeImportText(item.start_year),
        end: normalizeImportText(item.end_year),
        gpa: normalizeImportText(item.gpa),
        scale: normalizeImportText(item.gpa_scale),
      }))
      .filter((entry) => Object.values(entry).some(Boolean));
  }

  const text = formatPreviewValue(value);
  if (!text || text === 'Not set') return [];

  return text
    .split(/\s*(?=\d+\.\s)/)
    .map((segment) => segment.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .map((segment) => {
      const fields = segment.split(/\s*\|\s*/).reduce((acc, part) => {
        const [rawKey, ...rawValue] = part.split(':');
        if (!rawKey || rawValue.length === 0) return acc;
        const key = rawKey.trim().toLowerCase();
        const val = rawValue.join(':').trim();
        acc[key] = val;
        return acc;
      }, {});

      return {
        degree: normalizeImportText(fields.degree),
        major: normalizeImportText(fields.major),
        institution: normalizeImportText(fields.institution),
        start: normalizeImportText(fields.start),
        end: normalizeImportText(fields.end),
        gpa: normalizeImportText(fields.gpa),
        scale: normalizeImportText(fields.scale),
      };
    })
    .filter((entry) => Object.values(entry).some(Boolean));
};

const parseExperiencePreviewEntries = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        title: normalizeImportText(item.title),
        company: normalizeImportText(item.company),
        duration: normalizeImportText(item.duration),
        start: normalizeImportText(item.start_date || item.start),
        end: normalizeImportText(item.end_date || item.end),
        description: normalizeImportText(item.description),
      }))
      .filter((entry) => Object.values(entry).some(Boolean));
  }

  const text = formatPreviewValue(value);
  if (!text || text === 'Not set') return [];

  return text
    .split(/\s*(?=\d+\.\s)/)
    .map((segment) => segment.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .map((segment) => {
      const fields = segment.split(/\s*\|\s*/).reduce((acc, part) => {
        const [rawKey, ...rawValue] = part.split(':');
        if (!rawKey || rawValue.length === 0) return acc;
        const key = rawKey.trim().toLowerCase();
        const val = rawValue.join(':').trim();
        acc[key] = val;
        return acc;
      }, {});

      return {
        title: normalizeImportText(fields.title),
        company: normalizeImportText(fields.company),
        duration: normalizeImportText(fields.duration),
        start: normalizeImportText(fields.start),
        end: normalizeImportText(fields.end),
        description: normalizeImportText(fields.description),
      };
    })
    .filter((entry) => Object.values(entry).some(Boolean));
};

const formatExperienceDates = (entry) => {
  const duration = normalizeImportText(entry.duration);
  if (duration) return duration;
  const start = normalizeImportText(entry.start);
  const end = normalizeImportText(entry.end);
  if (start || end) return `${start || 'N/A'} - ${end || 'Present'}`;
  return 'Dates not set';
};

const isHundredScale = (scale) => {
  const normalized = normalizeImportText(scale).replace(/[%\s]/g, '');
  return normalized === '100' || normalized === '100.0' || normalized === '100.00';
};

const isPercentageLikeScore = (score, scale) => {
  if (isHundredScale(scale)) return true;
  const numeric = Number(String(score || '').trim());
  return Number.isFinite(numeric) && numeric > 10;
};

const formatEducationScore = (entry) => {
  if (!entry.gpa) return '';
  if (isPercentageLikeScore(entry.gpa, entry.scale)) return ` | Marks: ${entry.gpa}%`;
  if (entry.scale) return ` | GPA: ${entry.gpa}/${entry.scale}`;
  return ` | GPA: ${entry.gpa}`;
};

const isPrimaryContactLabel = (label) => {
  const normalized = normalizeImportText(label).toLowerCase();
  return ['phone', 'email', 'linkedin', 'github', 'website'].includes(normalized);
};

const removePrimaryContactFields = (fields = []) => (Array.isArray(fields) ? fields : [])
  .filter((field) => field && typeof field === 'object')
  .filter((field) => !isPrimaryContactLabel(field.label));

const buildPrimaryContactFields = ({ phone = '', linkedin = '', github = '', website = '', email = '' }) => {
  const seeded = [
    { id: 1, label: 'Phone', value: normalizeImportText(phone), type: 'phone' },
    { id: 2, label: 'LinkedIn', value: normalizeImportText(linkedin), type: 'url' },
    { id: 3, label: 'GitHub', value: normalizeImportText(github), type: 'url' },
    { id: 4, label: 'Website', value: normalizeImportText(website), type: 'url' },
    { id: 5, label: 'Email', value: normalizeImportText(email), type: 'email' },
  ];
  return seeded.filter((field) => field.value);
};

const getSecondaryContactFields = (fields = []) => (Array.isArray(fields) ? fields : [])
  .filter((field) => field && typeof field === 'object')
  .filter((field) => !isPrimaryContactLabel(field.label));

const formatContactFieldLabel = (field) => {
  if (!field || typeof field !== 'object') return 'Link';
  const label = normalizeImportText(field.label);
  if (!label) return 'Link';
  return label.replace(/\s+/g, ' ');
};

const formatContactFieldValue = (field) => {
  if (!field || typeof field !== 'object') return '';
  return normalizeImportText(field.value);
};

const normalizeContactValueForCompare = (value) => {
  const text = normalizeImportText(value);
  if (!text) return '';
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.replace(/\/$/, '');
  return normalized;
};

const getSecondaryContactKey = (field) => {
  const labelKey = normalizeImportText(field?.label).toLowerCase();
  const valueKey = normalizeContactValueForCompare(field?.value);
  return `secondary_contact::${labelKey}::${valueKey}`;
};

const getSecondaryContactDiffItems = (currentFields = [], resumeFields = []) => {
  const currentSecondary = getSecondaryContactFields(currentFields);
  const resumeSecondary = getSecondaryContactFields(resumeFields);
  const currentByExact = new Map();
  const currentByLabel = new Map();

  for (const field of currentSecondary) {
    currentByExact.set(getSecondaryContactKey(field), field);
    const labelKey = normalizeImportText(field?.label).toLowerCase();
    if (!currentByLabel.has(labelKey)) {
      currentByLabel.set(labelKey, field);
    }
  }

  return resumeSecondary.map((field) => {
    const key = getSecondaryContactKey(field);
    const labelKey = normalizeImportText(field?.label).toLowerCase();
    const currentMatch = currentByExact.get(key) || currentByLabel.get(labelKey) || null;

    return {
      key,
      label: formatContactFieldLabel(field),
      resume_value: formatContactFieldValue(field),
      current_value: currentMatch ? formatContactFieldValue(currentMatch) : '',
      recommended_action: 'use_resume',
      isSecondaryContact: true,
    };
  });
};

const buildMergedImportProfile = (currentProfile, importDraft, selections, skillSelections) => {
  // Keep backend schema unchanged while allowing per-link preview decisions for secondary contacts.
  const importedContactFields = (importDraft.contact_fields || []).filter((field) => {
    if (isPrimaryContactLabel(field?.label)) return true;
    return selections[getSecondaryContactKey(field)] !== false;
  });

  const nextPhone = selections.phone ? normalizeImportText(importDraft.phone) : normalizeImportText(currentProfile.phone);
  const nextLinkedin = selections.linkedin ? normalizeImportText(importDraft.linkedin) : normalizeImportText(currentProfile.linkedin);
  const nextGithub = selections.github ? normalizeImportText(importDraft.github) : normalizeImportText(currentProfile.github);
  const nextWebsite = selections.website ? normalizeImportText(importDraft.website) : normalizeImportText(currentProfile.website);
  const currentEmail = normalizeImportText(
    (currentProfile.contact_fields || []).find((f) => normalizeImportText(f?.label).toLowerCase() === 'email')?.value,
  );

  const mergedContacts = mergeImportedContactFields(currentProfile.contact_fields || [], importedContactFields);
  const secondaryContacts = removePrimaryContactFields(mergedContacts);
  const primaryContacts = buildPrimaryContactFields({
    phone: nextPhone,
    linkedin: nextLinkedin,
    github: nextGithub,
    website: nextWebsite,
    email: currentEmail,
  });

  return {
    ...currentProfile,
    summary: selections.summary ? normalizeImportText(importDraft.summary) : currentProfile.summary,
    phone: nextPhone,
    linkedin: nextLinkedin,
    github: nextGithub,
    website: nextWebsite,
    contact_fields: [...primaryContacts, ...secondaryContacts],
    skills: uniqueImportedValues([...(currentProfile.skills || []), ...(importDraft.skills || [])]).filter((skill) => skillSelections[normalizeSkillKey(skill)] !== false),
    experience: selections.experience ? (importDraft.experience || []) : currentProfile.experience,
    education: selections.education ? (importDraft.education || []) : currentProfile.education,
  };
};

export default function ProfilePage() {
  const KNOWN_GPA_SCALES = new Set(['4', '10', '100']);

  const [profile, setProfile] = useState({
    summary: '',
    phone: '',
    linkedin: '',
    github: '',
    website: '',
    contact_fields: [],
    skills: [],
    experience: [],
    education: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skillInput, setSkillInput] = useState('');
  const [resumes, setResumes] = useState([]);

  const [savedAnswers, setSavedAnswers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmAnswerId, setConfirmAnswerId] = useState(null);
  const [confirmEducationIndex, setConfirmEducationIndex] = useState(null);
  const [confirmExperienceIndex, setConfirmExperienceIndex] = useState(null);
  const [confirmContactFieldId, setConfirmContactFieldId] = useState(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [deletingAllAnswers, setDeletingAllAnswers] = useState(false);
  const [dragItem, setDragItem] = useState({ section: null, index: null });
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const answersToShow = 6;

  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState(null);
  const [isCustomScaleSelected, setIsCustomScaleSelected] = useState(false);
  const [educationDraft, setEducationDraft] = useState({
    degree: '',
    major: '',
    institution: '',
    start_year: '',
    end_year: '',
    gpa: '',
    gpa_scale: '',
  });

  const [importResumePickerOpen, setImportResumePickerOpen] = useState(false);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgressMessage, setImportProgressMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [pendingImportResumeIds, setPendingImportResumeIds] = useState([]);
  const [importPreview, setImportPreview] = useState(null);
  const [importSelections, setImportSelections] = useState({});
  const [importSkillSelections, setImportSkillSelections] = useState({});

  const cleanProfileRef = useRef(null);
  const autosavingOrderRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (cleanProfileRef.current === null) return;
    setIsDirty(JSON.stringify(profile) !== cleanProfileRef.current);
  }, [profile]);

  const { registerGuard, clearGuard, isBlocked, proceed, cancel } = useNavigationGuard();
  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    registerGuard(() => isDirtyRef.current);
    return () => clearGuard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentinelPushedRef = useRef(false);
  const [backBlocked, setBackBlocked] = useState(false);

  const normalizeSkill = (value) => String(value || '').trim().toLowerCase();

  const moveInArray = (items, fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleDragStart = (section, index) => (e) => {
    setDragItem({ section, index });
    e.dataTransfer.effectAllowed = 'move';
    // Required in Firefox for drag start to work.
    e.dataTransfer.setData('text/plain', `${section}:${index}`);

    // Show the full row/card as drag preview instead of just the handle icon.
    const dragContainer = e.currentTarget.closest('[data-drag-container="true"]');
    if (dragContainer) {
      e.dataTransfer.setDragImage(dragContainer, 24, 24);
    }
  };

  const handleDragEnd = () => {
    setDragItem({ section: null, index: null });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragOverReorder = (section, toIndex) => (e) => {
    e.preventDefault();
    setProfile((p) => {
      if (dragItem.section !== section || dragItem.index === null) return p;
      if (dragItem.index === toIndex) return p;

      if (section === 'experience') {
        return { ...p, experience: moveInArray(p.experience, dragItem.index, toIndex) };
      }
      if (section === 'education') {
        return { ...p, education: moveInArray(p.education, dragItem.index, toIndex) };
      }
      if (section === 'contact_fields') {
        return { ...p, contact_fields: moveInArray(p.contact_fields, dragItem.index, toIndex) };
      }
      return p;
    });

    // Keep dragged index in sync after live reorder for smooth movement.
    setDragItem((current) => ({ ...current, index: toIndex }));
  };

  const handleDropReorder = (section, toIndex) => (e) => {
    e.preventDefault();
    // Most reordering already happens live in onDragOver; onDrop only finalizes state.
    setDragItem({ section: null, index: null });
    void saveOrderSilently(profile);
  };

  // Helper function to parse skills - handles both comma-separated strings and arrays
  const parseSkills = (skillsData) => {
    if (!skillsData) return [];
    const dedupe = (items) => {
      const seen = new Set();
      const out = [];
      for (const item of items) {
        if (typeof item !== 'string') continue;
        const trimmed = item.trim();
        if (!trimmed) continue;
        const key = normalizeSkill(trimmed);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(trimmed);
      }
      return out;
    };

    if (typeof skillsData === 'string') {
      // Split comma-separated string and trim each skill
      return dedupe(skillsData.split(','));
    }
    if (Array.isArray(skillsData)) {
      // If already array but contains comma-separated strings, parse them
      const parsed = [];
      for (const skill of skillsData) {
        if (typeof skill === 'string' && skill.includes(',')) {
          parsed.push(...skill.split(','));
        } else {
          parsed.push(skill);
        }
      }
      return dedupe(parsed);
    }
    return [];
  };

  const getContactPlaceholder = (type) => {
    if (type === 'phone') return '+91 98765 43210';
    if (type === 'email') return 'email@example.com';
    if (type === 'url') return 'https://example.com';
    return 'Enter value';
  };

  const normalizeContactFields = (fields, fallback = {}) => {
    const toType = (value) => (['text', 'email', 'phone', 'url'].includes(value) ? value : 'text');

    if (Array.isArray(fields) && fields.length > 0) {
      return fields.map((field, index) => ({
        id: Number.isInteger(field?.id) ? field.id : index + 1,
        label: (field?.label || 'Custom Field').trim(),
        value: field?.value || '',
        type: toType(field?.type),
      }));
    }

    const seeded = [
      { id: 1, label: 'Phone', value: fallback.phone || '', type: 'phone' },
      { id: 2, label: 'LinkedIn', value: fallback.linkedin || '', type: 'url' },
      { id: 3, label: 'GitHub', value: fallback.github || '', type: 'url' },
      { id: 4, label: 'Website', value: fallback.website || '', type: 'url' },
      { id: 5, label: 'Email', value: fallback.email || '', type: 'email' },
    ];
    return seeded.filter((field) => field.value);
  };

  const getActionButton = (field) => {
    const value = String(field?.value || '').trim();
    if (!value) return null;

    if (field.type === 'email') {
      return (
        <a
          href={`mailto:${value}`}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          title="Send email"
          onClick={(e) => e.stopPropagation()}
        >
          <Mail className="w-3.5 h-3.5" />
        </a>
      );
    }
    if (field.type === 'phone') {
      return (
        <a
          href={`tel:${value}`}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          title="Call phone"
          onClick={(e) => e.stopPropagation()}
        >
          <PhoneIcon className="w-3.5 h-3.5" />
        </a>
      );
    }
    if (field.type === 'url') {
      const href = value.startsWith('http') ? value : `https://${value}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          title="Open link"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      );
    }
    return null;
  };

  useEffect(() => {
    if (isDirty && !sentinelPushedRef.current) {
      history.pushState({ profileGuard: true }, '', window.location.pathname);
      sentinelPushedRef.current = true;
    }
  }, [isDirty]);

  useEffect(() => {
    const handlePopState = () => {
      if (isDirtyRef.current) {
        history.pushState({ profileGuard: true }, '', window.location.pathname);
        setBackBlocked(true);
      } else {
        sentinelPushedRef.current = false;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    api.get('/profile')
      .then((res) => {
        const contactFields = normalizeContactFields(res.data.contact_fields, res.data);
        const p = {
          summary: res.data.summary || '',
          phone: res.data.phone || '',
          linkedin: res.data.linkedin || '',
          github: res.data.github || '',
          website: res.data.website || '',
          contact_fields: contactFields,
          skills: parseSkills(res.data.skills),
          experience: res.data.experience || [],
          education: res.data.education || [],
        };
        setProfile(p);

        cleanProfileRef.current = JSON.stringify(p);
        setIsDirty(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get('/resumes')
      .then((res) => setResumes(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);

    api.get('/profile/saved-answers')
      .then((res) => setSavedAnswers(res.data))
      .catch(console.error);
  }, []);

  const buildPersistableProfile = useCallback((sourceProfile) => {
    const contactFields = Array.isArray(sourceProfile.contact_fields) ? sourceProfile.contact_fields : [];
    const findValue = (predicate) => {
      const match = contactFields.find(predicate);
      return (match?.value || '').trim();
    };

    const normalizedContactFields = contactFields
      .map(normalizeContactFieldForSave)
      .filter(Boolean);

    const normalizedExperience = Array.isArray(sourceProfile.experience)
      ? sourceProfile.experience.map(normalizeExperienceForSave).filter(Boolean)
      : [];

    const normalizedEducation = Array.isArray(sourceProfile.education)
      ? sourceProfile.education.map(normalizeEducationForSave).filter(Boolean)
      : [];

    return {
      ...sourceProfile,
      contact_fields: normalizedContactFields,
      experience: normalizedExperience,
      education: normalizedEducation,
      phone: findValue((f) => f.type === 'phone' && f.value),
      linkedin: findValue((f) => f.label?.trim().toLowerCase() === 'linkedin' && f.value),
      github: findValue((f) => f.label?.trim().toLowerCase() === 'github' && f.value),
      website: findValue((f) => f.label?.trim().toLowerCase() === 'website' && f.value),
    };
  }, []);

  const saveOrderSilently = useCallback(async (sourceProfile) => {
    if (autosavingOrderRef.current) return;
    const payloadProfile = buildPersistableProfile(sourceProfile);
    const payloadString = JSON.stringify(payloadProfile);
    if (cleanProfileRef.current === payloadString) return;

    autosavingOrderRef.current = true;
    try {
      await api.put('/profile', payloadProfile);
      setProfile(payloadProfile);
      cleanProfileRef.current = payloadString;
      setIsDirty(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to auto-save order. Please click Save Changes.');
    } finally {
      autosavingOrderRef.current = false;
    }
  }, [buildPersistableProfile]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payloadProfile = buildPersistableProfile(profile);

      await api.put('/profile', payloadProfile);
      setProfile(payloadProfile);
      cleanProfileRef.current = JSON.stringify(payloadProfile);
      setIsDirty(false);
      toast.success('Profile saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save profile. Please try again.');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [saving, profile, buildPersistableProfile]);

  const getDefaultResume = useCallback(() => {
    if (!resumes.length) return null;
    return resumes.find((resume) => resume.is_default) || resumes[0] || null;
  }, [resumes]);

  const openImportPreview = useCallback(async (resumeIds = []) => {
    const selectedIds = (resumeIds || []).filter((id) => resumes.some((resume) => resume.id === id));
    const fallbackResume = getDefaultResume();
    const targetResume = selectedIds.length ? resumes.find((resume) => resume.id === selectedIds[0]) : fallbackResume;
    if (!targetResume) {
      toast.error('Upload a resume first to use Map from Resume.');
      return;
    }

    setImportLoading(true);
    setImportProgressMessage('Generating preview from selected resumes...');
    setImportError('');
    try {
      const payload = selectedIds.length ? { resume_ids: selectedIds, resume_id: selectedIds[0] } : { resume_id: targetResume.id };
      const response = await api.post('/ai/profile-import-preview', payload);
      const secondaryContactSelections = getSecondaryContactDiffItems(profile.contact_fields || [], response.data.resume_draft?.contact_fields || [])
        .reduce((acc, item) => {
          acc[item.key] = true;
          return acc;
        }, {});
      setImportPreview(response.data);
      setImportSelections({
        ...makeDefaultImportSelections(response.data.diff || []),
        ...secondaryContactSelections,
      });
      setImportSkillSelections(buildImportSkillSelectionState(profile.skills || [], response.data.resume_draft?.skills || []));
      setImportPreviewOpen(true);
      setPendingImportResumeIds(selectedIds.length ? selectedIds : [targetResume.id]);
    } catch (error) {
      console.error(error);
      setImportError('Unable to preview resume import right now.');
      toast.error('Unable to preview resume import.');
    } finally {
      setImportLoading(false);
      setImportProgressMessage('');
    }
  }, [resumes, getDefaultResume, profile.skills]);

  const startResumeImport = useCallback(() => {
    const defaultResume = getDefaultResume();
    if (!defaultResume) {
      toast.error('Upload a resume first to use Map from Resume.');
      return;
    }

    setPendingImportResumeIds([defaultResume.id]);
    setImportResumePickerOpen(true);
  }, [getDefaultResume]);

  const togglePendingResumeSelection = useCallback((resumeId) => {
    setPendingImportResumeIds((current) => {
      if (current.includes(resumeId)) {
        if (current.length === 1) return current;
        return current.filter((id) => id !== resumeId);
      }
      return [...current, resumeId];
    });
  }, []);

  const selectAllPendingResumes = useCallback(() => {
    setPendingImportResumeIds(resumes.map((resume) => resume.id));
  }, [resumes]);

  const selectFirstTwoPendingResumes = useCallback(() => {
    const firstTwo = resumes.slice(0, 2).map((resume) => resume.id);
    if (firstTwo.length) {
      setPendingImportResumeIds(firstTwo);
    }
  }, [resumes]);

  const confirmResumeSelection = useCallback(() => {
    if (!pendingImportResumeIds.length) {
      toast.error('Select at least one resume to continue.');
      return;
    }
    setImportResumePickerOpen(false);
    void openImportPreview(pendingImportResumeIds);
  }, [pendingImportResumeIds, openImportPreview]);

  const toggleImportSkillSelection = useCallback((skillKey) => {
    setImportSkillSelections((current) => ({
      ...current,
      [skillKey]: current[skillKey] === false,
    }));
  }, []);

  const toggleImportSkillGroup = useCallback((groupKey, shouldSelect) => {
    if (!importPreview) return;
    const grouped = getGroupedImportSkills(profile.skills || [], importPreview.resume_draft?.skills || [], importSkillSelections);
    const targetItems = grouped[groupKey] || [];
    if (!targetItems.length) return;

    setImportSkillSelections((current) => {
      const next = { ...current };
      for (const item of targetItems) {
        next[item.key] = shouldSelect;
      }
      return next;
    });
  }, [importPreview, profile.skills, importSkillSelections]);

  const toggleImportSelection = useCallback((key) => {
    setImportSelections((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const saveImportedProfile = useCallback(async () => {
    if (!importPreview) return;
    if (saving) return;

    const mergedProfile = buildMergedImportProfile(profile, importPreview.resume_draft, importSelections, importSkillSelections);
    const previewSnapshot = importPreview;
    const selectionSnapshot = importSelections;
    const skillSelectionSnapshot = importSkillSelections;
    setSaving(true);
    setImportConfirmOpen(false);
    setImportPreviewOpen(false);
    setImportPreview(null);
    try {
      const payloadProfile = buildPersistableProfile(mergedProfile);
      const response = await api.put('/profile', payloadProfile);
      const savedProfile = buildPersistableProfile({ ...payloadProfile, ...(response.data || {}) });
      setProfile(savedProfile);
      cleanProfileRef.current = JSON.stringify(savedProfile);
      setIsDirty(false);
      setImportPreviewOpen(false);
      setImportConfirmOpen(false);
      setImportPreview(null);
      setImportSelections({});
      setImportSkillSelections({});
      setPendingImportResumeIds([]);
      toast.success('Profile updated from resume.');
    } catch (error) {
      console.error(error);
      const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Please try again.';
      toast.error(`Failed to save imported profile. ${detail}`);
      setImportPreview(previewSnapshot);
      setImportSelections(selectionSnapshot);
      setImportSkillSelections(skillSelectionSnapshot);
      setImportPreviewOpen(true);
    } finally {
      setSaving(false);
    }
  }, [importPreview, importSelections, importSkillSelections, profile, saving, buildPersistableProfile]);

  const handleSaveAndLeave = useCallback(async () => {
    try {
      await handleSave();
      clearGuard();
      proceed();
    } catch {
      // stay on page
    }
  }, [handleSave, clearGuard, proceed]);

  const handleDiscardAndLeave = useCallback(() => {
    setProfile(JSON.parse(cleanProfileRef.current));
    setIsDirty(false);
    clearGuard();
    proceed();
  }, [clearGuard, proceed]);

  const handleBackSaveAndLeave = useCallback(async () => {
    try {
      await handleSave();
      setBackBlocked(false);
      sentinelPushedRef.current = false;
      clearGuard();
      history.go(-2);
    } catch {
      // stay on page
    }
  }, [handleSave, clearGuard]);

  const handleBackDiscard = useCallback(() => {
    setProfile(JSON.parse(cleanProfileRef.current));
    setIsDirty(false);
    setBackBlocked(false);
    sentinelPushedRef.current = false;
    clearGuard();
    history.go(-2);
  }, [clearGuard]);

  const dialogOpen = isBlocked || backBlocked;
  const dialogHandlers = backBlocked
    ? { onSave: handleBackSaveAndLeave, onDiscard: handleBackDiscard, onStay: () => setBackBlocked(false) }
    : { onSave: handleSaveAndLeave, onDiscard: handleDiscardAndLeave, onStay: cancel };

  const addSkill = () => {
    const value = skillInput.trim();
    const normalized = normalizeSkill(value);
    if (!value) return;
    if (profile.skills.some((s) => normalizeSkill(s) === normalized)) {
      toast.error('This skill is already added.');
      return;
    }
    setProfile((p) => ({ ...p, skills: [...p.skills, value] }));
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setProfile((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));
  };

  const addExperience = () => {
    setProfile((p) => ({
      ...p,
      experience: [...p.experience, { title: '', company: '', duration: '', description: '' }],
    }));
  };

  const updateExperience = (index, field, value) => {
    const exp = [...profile.experience];
    exp[index] = { ...exp[index], [field]: value };
    setProfile((p) => ({ ...p, experience: exp }));
  };

  const requestRemoveExperience = (index) => {
    setConfirmExperienceIndex(index);
  };

  const removeExperience = () => {
    if (confirmExperienceIndex === null) return;
    setProfile((p) => ({ ...p, experience: p.experience.filter((_, i) => i !== confirmExperienceIndex) }));
    setConfirmExperienceIndex(null);
  };

  const addEducation = () => {
    setProfile((p) => ({
      ...p,
      education: [...p.education, { degree: '', major: '', institution: '', start_year: '', end_year: '', gpa: '' }],
    }));
  };

  const updateEducation = (index, field, value) => {
    const edu = [...profile.education];
    edu[index] = { ...edu[index], [field]: value };
    setProfile((p) => ({ ...p, education: edu }));
  };

  const requestRemoveEducation = (index) => {
    setConfirmEducationIndex(index);
  };

  const removeEducation = () => {
    if (confirmEducationIndex === null) return;
    setProfile((p) => ({
      ...p,
      education: p.education.filter((_, i) => i !== confirmEducationIndex),
    }));
    setConfirmEducationIndex(null);
  };

  const addContactField = () => {
    setProfile((p) => {
      const maxId = p.contact_fields.reduce((max, field) => Math.max(max, Number(field.id) || 0), 0);
      return {
        ...p,
        contact_fields: [
          ...p.contact_fields,
          { id: maxId + 1, label: 'Custom Field', value: '', type: 'text' },
        ],
      };
    });
  };

  const updateContactField = (id, updates) => {
    setProfile((p) => ({
      ...p,
      contact_fields: p.contact_fields.map((field) => (field.id === id ? { ...field, ...updates } : field)),
    }));
  };

  const requestRemoveContactField = (id) => {
    setConfirmContactFieldId(id);
  };

  const removeContactField = () => {
    if (confirmContactFieldId === null) return;
    setProfile((p) => ({
      ...p,
      contact_fields: p.contact_fields.filter((field) => field.id !== confirmContactFieldId),
    }));
    setConfirmContactFieldId(null);
  };

  const openEducationModal = (index = null) => {
    if (index !== null) {
      const current = profile.education[index] || {};
      setEditingEducationIndex(index);
      const currentScale = current.gpa_scale || '';
      setIsCustomScaleSelected(Boolean(currentScale) && !KNOWN_GPA_SCALES.has(currentScale));
      setEducationDraft({
        degree: current.degree || '',
        major: current.major || '',
        institution: current.institution || '',
        start_year: current.start_year || '',
        end_year: current.end_year || '',
        gpa: current.gpa || '',
        gpa_scale: current.gpa_scale || '',
      });
    } else {
      setEditingEducationIndex(null);
      setIsCustomScaleSelected(false);
      setEducationDraft({
        degree: '',
        major: '',
        institution: '',
        start_year: '',
        end_year: '',
        gpa: '',
        gpa_scale: '',
      });
    }
    setEducationModalOpen(true);
  };

  const saveEducation = () => {
    if (editingEducationIndex !== null) {
      setProfile((p) => {
        const next = [...p.education];
        next[editingEducationIndex] = { ...educationDraft };
        return { ...p, education: next };
      });
    } else {
      setProfile((p) => ({ ...p, education: [...p.education, { ...educationDraft }] }));
    }
    setEducationModalOpen(false);
  };

  const formatGPA = (gpa, scale) => {
    if (!gpa) return '';
    const scaleMap = {
      '4': '/4.0',
      '10': '/10',
      '100': '%',
    };
    if (!scale) return gpa;
    if (scaleMap[scale]) return `${gpa}${scaleMap[scale]}`;
    const custom = String(scale).trim();
    if (!custom) return gpa;
    if (custom.startsWith('/') || custom.startsWith('%')) return `${gpa}${custom}`;
    if (custom.toLowerCase().startsWith('out of')) return `${gpa} ${custom}`;
    return `${gpa}/${custom}`;
  };

  const startEditSummary = () => {
    setSummaryDraft(profile.summary);
    setEditingSummary(true);
  };

  const saveSummary = () => {
    setProfile((p) => ({ ...p, summary: summaryDraft }));
    setEditingSummary(false);
  };

  const summaryPreview = summaryExpanded
    ? profile.summary
    : `${profile.summary.slice(0, 220)}${profile.summary.length > 220 ? '...' : ''}`;

  const startEditAnswer = (item) => {
    setEditingId(item.id);
    setEditValue(item.answer);
  };

  const saveEdit = async (id) => {
    try {
      const res = await api.put(`/profile/saved-answers/${id}`, { answer: editValue });
      setSavedAnswers((prev) => prev.map((a) => (a.id === id ? res.data : a)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update saved answer');
    }
  };

  const deleteAnswer = async () => {
    try {
      await api.delete(`/profile/saved-answers/${confirmAnswerId}`);
      setSavedAnswers((prev) => prev.filter((a) => a.id !== confirmAnswerId));
      setConfirmAnswerId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete saved answer');
    }
  };

  const deleteAllAnswers = async () => {
    if (deletingAllAnswers) return;
    setDeletingAllAnswers(true);
    try {
      await api.delete('/profile/saved-answers');
      setSavedAnswers([]);
      setShowAllAnswers(false);
      setConfirmDeleteAllOpen(false);
      toast.success('All saved answers deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete saved answers');
    } finally {
      setDeletingAllAnswers(false);
    }
  };

  const visibleAnswers = showAllAnswers ? savedAnswers : savedAnswers.slice(0, answersToShow);
  const importSkillGroups = importPreview ? getGroupedImportSkills(profile.skills || [], importPreview.resume_draft?.skills || [], importSkillSelections) : { matched: [], profile: [], resume: [] };

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <Helmet><title>Profile | JobAssist AI</title></Helmet>
        <PageLoadingState label="Loading profile..." rows={4} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      <Helmet><title>Profile | JobAssist AI</title></Helmet>

      {importLoading ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/12 bg-[#101010]/95 shadow-2xl shadow-black/45">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <div className="p-7 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/60" />
                Preparing preview
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/14 bg-white/[0.04]">
                  <Loader2 className="h-5 w-5 animate-spin text-white/90" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-semibold leading-tight text-white">
                    {importProgressMessage || 'Generating preview from selected resumes...'}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    Creating a preview first so you can review everything before any profile data is saved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <UnsavedChangesDialog
        open={dialogOpen}
        onSave={dialogHandlers.onSave}
        onDiscard={dialogHandlers.onDiscard}
        onStay={dialogHandlers.onStay}
      />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/[0.01] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/[0.01] blur-[100px] rounded-full" />
      </div>

      <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Professional Profile</h1>
              <p className="text-sm text-white/40 mt-0.5">Build your career story</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              <button
                onClick={startResumeImport}
                className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-semibold text-sm transition-all"
              >
                <span className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Map from Resume
                </span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="self-start sm:self-auto px-5 py-2 bg-white hover:bg-white/90 text-black rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-4 pb-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <UserIcon />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">ABOUT</h2>
                    <p className="text-xs text-white/40 mt-0.5">Professional Summary</p>
                  </div>
                </div>
                {!editingSummary && (
                  <button
                    onClick={startEditSummary}
                    className="self-start p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {editingSummary ? (
                <div className="space-y-4">
                  <textarea
                    value={summaryDraft}
                    onChange={(e) => setSummaryDraft(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-sm text-white/90 focus:border-white/20 focus:outline-none resize-none transition-all placeholder:text-white/30"
                    rows={6}
                    placeholder="Write your professional summary..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={saveSummary}
                      className="px-5 py-2.5 bg-white hover:bg-white/90 text-black rounded-lg text-sm font-semibold transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSummary(false)}
                      className="px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[15px] text-white/70 leading-relaxed whitespace-pre-wrap">
                    {summaryPreview || 'Write a short summary about your background and goals.'}
                  </p>
                  {profile.summary.length > 220 && (
                    <button
                      onClick={() => setSummaryExpanded((v) => !v)}
                      className="flex items-center gap-1.5 px-4 py-2 mt-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 hover:text-white font-medium transition-all"
                    >
                      {summaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {summaryExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}
            </section>

            <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">EXPERIENCE</h2>
                    <p className="text-xs text-white/40 mt-0.5">Your career journey</p>
                  </div>
                </div>
                <button
                  onClick={addExperience}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Role
                </button>
              </div>

              <div className="space-y-8">
                {profile.experience.map((exp, i) => (
                  <div
                    key={i}
                    className={`relative group/item ${dragItem.section === 'experience' && dragItem.index === i ? 'opacity-60 ring-1 ring-white/20 rounded-xl' : ''}`}
                    data-drag-container="true"
                    onDragOver={handleDragOverReorder('experience', i)}
                    onDrop={handleDropReorder('experience', i)}
                  >
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                          <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                        </div>
                        {i < profile.experience.length - 1 && (
                          <div className="w-px h-full bg-gradient-to-b from-white/20 to-transparent mt-2" />
                        )}
                      </div>

                      <div className="flex-1 pb-2">
                        <div className="bg-black/20 border border-white/5 rounded-xl p-4 sm:p-5 hover:border-white/10 transition-all">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                            <div className="flex-1 space-y-2">
                              <input
                                value={exp.title}
                                onChange={(e) => updateExperience(i, 'title', e.target.value)}
                                className="w-full bg-transparent border-none text-base font-bold text-white placeholder:text-white/30 focus:outline-none"
                                placeholder="Job Title"
                              />
                              <input
                                value={exp.company}
                                onChange={(e) => updateExperience(i, 'company', e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-white/60 placeholder:text-white/30 focus:outline-none"
                                placeholder="Company Name"
                              />
                              <input
                                value={exp.duration}
                                onChange={(e) => updateExperience(i, 'duration', e.target.value)}
                                className="w-full bg-transparent border-none text-xs text-white/40 placeholder:text-white/30 focus:outline-none"
                                placeholder="Jan 2022 - Present"
                              />
                            </div>
                            <div className="flex flex-row sm:flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity self-start">
                              <button
                                draggable
                                onDragStart={handleDragStart('experience', i)}
                                onDragEnd={handleDragEnd}
                                className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-grab active:cursor-grabbing"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => requestRemoveExperience(i)}
                                className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={exp.description}
                            onChange={(e) => updateExperience(i, 'description', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-white/70 focus:border-white/20 focus:outline-none resize-none transition-all placeholder:text-white/30"
                            rows={3}
                            placeholder="Describe your key responsibilities and achievements..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {profile.experience.length === 0 && (
                  <p className="text-sm text-white/40">No experience entries yet. Click Add Role to get started.</p>
                )}
              </div>
            </section>

            <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-7 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">EDUCATION</h2>
                    <p className="text-xs text-white/40 mt-0.5">Academic background</p>
                  </div>
                </div>
                <button
                  onClick={() => openEducationModal(null)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              <div className="space-y-4">
                {profile.education.map((edu, i) => (
                  <div
                    key={i}
                    className={`group/edu bg-black/20 border border-white/5 rounded-xl p-4 sm:p-5 hover:border-white/10 transition-all ${dragItem.section === 'education' && dragItem.index === i ? 'opacity-60 ring-1 ring-white/20' : ''}`}
                    data-drag-container="true"
                    onDragOver={handleDragOverReorder('education', i)}
                    onDrop={handleDropReorder('education', i)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white">{edu.institution || 'Institution'}</h3>
                        <p className="text-sm text-white/60 mt-1">
                          {edu.degree || 'Degree'}{edu.major ? ` · ${edu.major}` : ''}
                        </p>
                        <p className="text-xs text-white/40 mt-1.5">
                          {edu.start_year || 'Start'} - {edu.end_year || 'End'}{edu.gpa ? ` · ${formatGPA(edu.gpa, edu.gpa_scale)}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/edu:opacity-100 transition-opacity self-start">
                        <button
                          draggable
                          onDragStart={handleDragStart('education', i)}
                          onDragEnd={handleDragEnd}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-grab active:cursor-grabbing"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEducationModal(i)}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestRemoveEducation(i)}
                          className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {profile.education.length === 0 && (
                  <p className="text-sm text-white/40">No education entries yet. Click Add to get started.</p>
                )}
              </div>
            </section>

            <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <DatabaseIcon />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">SAVED ANSWERS</h2>
                    <p className="text-xs text-white/40 mt-1">Learned from form submissions</p>
                    <p className="text-xs text-white/30 mt-0.5">Auto-filled on future forms</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {savedAnswers.length > 0 && (
                    <button
                      onClick={() => setConfirmDeleteAllOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-300/90 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 hover:border-red-400/40 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete All
                    </button>
                  )}
                  <div className="text-xs text-white/30">{savedAnswers.length} answers</div>
                </div>
              </div>

              {savedAnswers.length === 0 ? (
                <p className="mt-6 text-sm text-white/40">No saved answers yet. Fill out forms on Autofill and they will appear here.</p>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visibleAnswers.map((item) => (
                      <div key={item.id} className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                        {editingId === item.id ? (
                          <div className="space-y-3">
                            <label className="block text-xs font-medium text-white/50 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.question}</label>
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(item.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(item.id)}
                                className="px-4 py-1.5 bg-white hover:bg-white/90 text-black rounded-lg text-sm font-semibold transition-all"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between mb-3 gap-2">
                              <p className="text-xs font-medium text-white/50 break-words flex-1" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.question}</p>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => startEditAnswer(item)}
                                  className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setConfirmAnswerId(item.id)}
                                  className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-white/90 font-medium break-words overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {savedAnswers.length > answersToShow && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setShowAllAnswers((v) => !v)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-all"
                      >
                        {showAllAnswers ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show {savedAnswers.length - answersToShow} More
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <section className="lg:sticky lg:top-24 relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Resume import</h2>
                  <p className="text-xs text-white/40 mt-0.5">Compare your profile against a resume</p>
                </div>
              </div>

              <p className="text-sm text-white/55 leading-relaxed">
                Use the selected resume to map profile fields without overwriting anything until you explicitly confirm it.
              </p>

              <button
                onClick={startResumeImport}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl text-sm font-semibold transition-all hover:bg-white/90"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Map from Resume
              </button>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                {resumes.length > 0 ? `${resumes.length} resume${resumes.length === 1 ? '' : 's'} available.` : 'Upload a resume to enable import.'}
              </div>
            </section>

            <section className="lg:sticky lg:top-24 relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">CONTACT</h2>
                  <p className="text-xs text-white/40 mt-0.5">Get in touch</p>
                </div>
              </div>

              <div className="space-y-3">
                {profile.contact_fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`group/field ${dragItem.section === 'contact_fields' && dragItem.index === index ? 'opacity-60 ring-1 ring-white/20 rounded-lg' : ''}`}
                    data-drag-container="true"
                    onDragOver={handleDragOverReorder('contact_fields', index)}
                    onDrop={handleDropReorder('contact_fields', index)}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2 sm:gap-2">
                      <input
                        value={field.label}
                        onChange={(e) => updateContactField(field.id, { label: e.target.value })}
                        className="bg-transparent border-none text-xs font-medium text-white/40 focus:text-white/70 focus:outline-none px-0 py-0 flex-1"
                        placeholder="Label"
                      />
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/field:opacity-100 transition-opacity self-start">
                        <button
                          draggable
                          onDragStart={handleDragStart('contact_fields', index)}
                          onDragEnd={handleDragEnd}
                          className="p-1 text-white/30 hover:text-white hover:bg-white/10 rounded transition-all opacity-0 group-hover/field:opacity-100 cursor-grab active:cursor-grabbing"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-3 h-3" />
                        </button>
                        <select
                          value={field.type}
                          onChange={(e) => updateContactField(field.id, { type: e.target.value })}
                          className="appearance-none bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-medium focus:border-white/20 focus:bg-white/10 focus:outline-none opacity-0 group-hover/field:opacity-100 transition-all cursor-pointer hover:bg-white/10"
                        >
                          {CONTACT_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="bg-[#1a1a1a] text-white">
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => requestRemoveContactField(field.id)}
                          className="p-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover/field:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        value={field.value}
                        onChange={(e) => updateContactField(field.id, { value: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                        placeholder={getContactPlaceholder(field.type)}
                      />
                      {field.value && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          {getActionButton(field)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addContactField}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 text-white rounded-lg text-sm font-medium transition-all mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </button>
              </div>
            </section>

            <div className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/20 hover:shadow-black/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <CodeIcon />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">SKILLS</h2>
                    <p className="text-xs text-white/40 mt-0.5">{profile.skills.length} skills</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all"
                    placeholder="Add a skill..."
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {profile.skills.map((skill, i) => (
                    <span
                      key={`${skill}-${i}`}
                      className="group/skill inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-b from-white/[0.06] to-white/[0.03] hover:from-white/[0.1] hover:to-white/[0.06] border border-white/10 hover:border-white/20 text-white/85 rounded-xl text-sm font-medium transition-all hover:scale-[1.03] cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="opacity-100 sm:opacity-0 sm:group-hover/skill:opacity-100 hover:text-red-400 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

      </div>

      {educationModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-[#111111] border-b border-white/10 px-7 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {editingEducationIndex !== null ? 'Edit Education' : 'Add Education'}
                </h3>
              </div>
              <button
                onClick={() => setEducationModalOpen(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Degree</label>
                  <input
                    value={educationDraft.degree}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, degree: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="e.g. B.Tech, MBA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Major</label>
                  <input
                    value={educationDraft.major || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, major: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Institution</label>
                <input
                  value={educationDraft.institution}
                  onChange={(e) => setEducationDraft((d) => ({ ...d, institution: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                  placeholder="e.g. Kalinga Institute of Industrial Technology"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Start</label>
                  <input
                    value={educationDraft.start_year || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, start_year: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="2023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">End</label>
                  <input
                    value={educationDraft.end_year || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, end_year: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="2027"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">GPA / %</label>
                  <input
                    value={educationDraft.gpa || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, gpa: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="8.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">GPA Scale (Optional)</label>
                <select
                  value={isCustomScaleSelected ? 'custom' : (educationDraft.gpa_scale || '')}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === 'custom') {
                      setIsCustomScaleSelected(true);
                      setEducationDraft((d) => ({
                        ...d,
                        gpa_scale: KNOWN_GPA_SCALES.has(d.gpa_scale || '') ? '' : (d.gpa_scale || ''),
                      }));
                    } else {
                      setIsCustomScaleSelected(false);
                      setEducationDraft((d) => ({ ...d, gpa_scale: selected }));
                    }
                  }}
                  className="appearance-none w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="" className="bg-[#1a1a1a] text-white/60">Select scale</option>
                  <option value="4" className="bg-[#1a1a1a] text-white">Out of 4.0</option>
                  <option value="10" className="bg-[#1a1a1a] text-white">Out of 10.0</option>
                  <option value="100" className="bg-[#1a1a1a] text-white">Percentage (100%)</option>
                  <option value="custom" className="bg-[#1a1a1a] text-white">Custom</option>
                </select>
                {isCustomScaleSelected && (
                  <input
                    value={educationDraft.gpa_scale || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, gpa_scale: e.target.value }))}
                    className="mt-3 w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="e.g. 5, 7, Out of 5"
                  />
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#111111] border-t border-white/10 px-5 sm:px-7 py-4 sm:py-5 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                onClick={() => setEducationModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveEducation}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-white/90 text-black rounded-lg text-sm font-semibold transition-all"
              >
                {editingEducationIndex !== null ? 'Save Changes' : 'Add Education'}
              </button>
            </div>
          </div>
        </div>
      )}

      {importResumePickerOpen ? (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/12 bg-[#101010]/95 shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 px-6 py-5">
              <h3 className="text-xl font-semibold text-white tracking-tight">Choose Resumes For Import</h3>
              <p className="text-sm text-white/55 mt-1.5">Select one, two, or all resumes to build a combined profile preview.</p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-auto">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={selectAllPendingResumes}
                  className="rounded-lg border border-white/12 bg-white/4 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white/75 hover:bg-white/8"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={selectFirstTwoPendingResumes}
                  className="rounded-lg border border-white/12 bg-white/4 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white/75 hover:bg-white/8"
                >
                  Select first two
                </button>
                <p className="ml-auto rounded-lg border border-white/18 bg-white/10 text-white px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase">
                  {pendingImportResumeIds.length}/{resumes.length} selected
                </p>
              </div>

              <div className="space-y-2.5">
                {resumes.map((resume) => {
                  const selected = pendingImportResumeIds.includes(resume.id);
                  return (
                    <button
                      key={resume.id}
                      type="button"
                      onClick={() => togglePendingResumeSelection(resume.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${selected ? 'border-white/30 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'border-white/10 bg-black/20 text-white/90 hover:bg-white/6 hover:border-white/20'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{resume.filename || `Resume ${resume.id}`}</p>
                          <p className={`text-xs mt-1 ${selected ? 'text-white/65' : 'text-white/45'}`}>
                            {resume.is_default ? 'Default resume' : 'Uploaded resume'}
                          </p>
                        </div>
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-white/30 bg-white text-black' : 'border-white/20 bg-white/6'}`}>
                          {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row gap-2 sm:justify-end bg-white/[0.02] rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setImportResumePickerOpen(false);
                  setPendingImportResumeIds([]);
                }}
                className="px-4 py-2 rounded-lg border border-white/12 text-white/75 hover:text-white hover:bg-white/6"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResumeSelection}
                className="px-4 py-2 rounded-lg bg-white/92 text-black font-semibold hover:bg-white"
              >
                Continue to preview
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={importConfirmOpen}
        title="Save imported profile changes"
        message="Review the preview one last time, then confirm to save the selected profile values. Saved answers remain unchanged."
        confirmLabel={saving ? 'Saving...' : 'Save Changes'}
        danger={false}
        isLoading={saving}
        onConfirm={saveImportedProfile}
        onCancel={() => !saving && setImportConfirmOpen(false)}
      />

      {importPreviewOpen && importPreview && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/50 flex flex-col">
            <div className="px-5 sm:px-7 py-5 border-b border-white/10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-bold">Resume import preview</h3>
                </div>
                <p className="text-sm text-white/45 mt-1">
                  Compare your current profile with data extracted from {importPreview.resume_filename || 'the selected resume'}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setImportPreviewOpen(false);
                    setImportConfirmOpen(false);
                    setImportPreview(null);
                    setImportSelections({});
                    setImportSkillSelections({});
                    setImportProgressMessage('');
                    setPendingImportResumeIds([]);
                  }}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setImportConfirmOpen(true)}
                  className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-all"
                >
                  Review and save
                </button>
              </div>
            </div>

            {importError ? (
              <div className="m-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {importError}
              </div>
            ) : null}

            <div className="flex-1 overflow-auto p-5 sm:p-7 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">Skills</h4>
                    <p className="text-xs text-white/35 mt-1">Select the bubbles you want to keep from your profile and resume.</p>
                  </div>
                  {(() => {
                    const allSkills = uniqueImportedValues([...(profile.skills || []), ...(importPreview.resume_draft?.skills || [])]);
                    const selectedCount = allSkills.filter((skill) => importSkillSelections[normalizeSkillKey(skill)] !== false).length;
                    const unselectedCount = allSkills.length - selectedCount;
                    return (
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold tracking-[0.12em] uppercase text-emerald-100">
                          {selectedCount}/{allSkills.length} selected
                        </span>
                        <span className="rounded-lg border border-red-400/20 bg-red-500/15 px-3 py-1 text-xs font-bold tracking-[0.12em] uppercase text-red-100">
                          {unselectedCount} removed
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {[
                    ['matched', 'Matched in profile and resume', 'border-emerald-500/20 bg-emerald-500/10 text-emerald-50'],
                    ['profile', 'Only in profile', 'border-sky-500/20 bg-sky-500/10 text-sky-50'],
                    ['resume', 'Only in resume', 'border-amber-500/20 bg-amber-500/10 text-amber-50'],
                  ].map(([groupKey, title, tone]) => {
                    const items = importSkillGroups[groupKey] || [];
                    const selectedCount = items.filter((item) => item.isSelected).length;
                    return (
                      <div key={groupKey} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">{title}</p>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black tracking-[0.08em] shadow-lg ${
                              groupKey === 'matched'
                                ? 'border-emerald-300/60 bg-emerald-400/25 text-emerald-50 shadow-emerald-500/35'
                                : groupKey === 'profile'
                                  ? 'border-sky-300/60 bg-sky-400/25 text-sky-50 shadow-sky-500/35'
                                  : 'border-amber-300/60 bg-amber-400/25 text-amber-50 shadow-amber-500/35'
                            }`}
                          >
                            {selectedCount}/{items.length}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleImportSkillGroup(groupKey, true)}
                            className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/60 hover:bg-white/10 hover:text-white"
                          >
                            Keep section
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleImportSkillGroup(groupKey, false)}
                            className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/60 hover:bg-white/10 hover:text-white"
                          >
                            Remove section
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {items.length ? items.map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => toggleImportSkillSelection(item.key)}
                              className={`group relative rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${item.isSelected ? tone : 'border-white/10 bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/75'}`}
                              title={item.isSelected ? 'Click to remove this skill' : 'Click to keep this skill'}
                            >
                              <span className="pr-4">{item.skill}</span>
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.isSelected ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              </span>
                            </button>
                          )) : <p className="text-sm text-white/30">None</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const baseDiffItems = (importPreview.diff || []).filter((item) => !['skills', 'contact_fields'].includes(item.key));
                const secondaryContactItems = getSecondaryContactDiffItems(
                  profile.contact_fields || [],
                  importPreview.resume_draft?.contact_fields || [],
                );

                const primaryContactKeys = ['phone', 'linkedin', 'github', 'website'];
                let insertAt = -1;
                for (let i = baseDiffItems.length - 1; i >= 0; i -= 1) {
                  if (primaryContactKeys.includes(baseDiffItems[i]?.key)) {
                    insertAt = i + 1;
                    break;
                  }
                }

                const orderedItems =
                  insertAt >= 0
                    ? [
                      ...baseDiffItems.slice(0, insertAt),
                      ...secondaryContactItems,
                      ...baseDiffItems.slice(insertAt),
                    ]
                    : [...baseDiffItems, ...secondaryContactItems];

                return orderedItems;
              })().map((item) => {
                const useResume = importSelections[item.key] !== false;
                const isEducation = item.key === 'education';
                const isExperience = item.key === 'experience';
                const resumeEducationEntries = isEducation ? (
                  (importPreview.resume_draft?.education || []).length
                    ? importPreview.resume_draft.education
                    : parseEducationPreviewEntries(item.resume_value)
                ) : [];
                const currentEducationEntries = isEducation ? parseEducationPreviewEntries(item.current_value) : [];
                const resumeExperienceEntries = isExperience ? (
                  (importPreview.resume_draft?.experience || []).length
                    ? importPreview.resume_draft.experience
                    : parseExperiencePreviewEntries(item.resume_value)
                ) : [];
                const currentExperienceEntries = isExperience ? parseExperiencePreviewEntries(item.current_value) : [];
                return (
                  <div key={item.key} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0f] p-4 sm:p-5">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-70" />
                    <div className="flex flex-col gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <h3 className="text-base font-semibold tracking-tight text-white">{item.label}</h3>
                          <span className="rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
                            {item.recommended_action === 'use_resume' ? 'Recommended' : 'Keep existing'}
                          </span>
                        </div>
                        
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Resume</p>
                            <div className={`rounded-xl border px-3.5 py-3 transition-colors duration-200 ${useResume ? 'border-white/20 bg-white/[0.05]' : 'border-white/10 bg-white/[0.015]'}`}>
                              {isEducation ? (
                                resumeEducationEntries.length ? (
                                  <div className="space-y-2.5">
                                    {resumeEducationEntries.map((entry, index) => (
                                      <div key={`resume-edu-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                        <p className={`text-sm font-semibold ${useResume ? 'text-white/94' : 'text-white/86'}`}>
                                          {entry.degree || 'Degree not set'}
                                          {entry.major ? ` - ${entry.major}` : ''}
                                        </p>
                                        <p className="mt-1 text-sm text-white/70 break-all [overflow-wrap:anywhere]">{entry.institution || 'Institution not set'}</p>
                                        <p className="mt-1 text-xs text-white/55">
                                          {(entry.start || entry.end) ? `${entry.start || 'N/A'} - ${entry.end || 'Present'}` : 'Dates not set'}
                                          {formatEducationScore(entry)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className={`text-[15px] leading-7 ${useResume ? 'text-white/93' : 'text-white/83'}`}>Not set</p>
                                )
                              ) : isExperience ? (
                                resumeExperienceEntries.length ? (
                                  <div className="space-y-2.5">
                                    {resumeExperienceEntries.map((entry, index) => (
                                      <div key={`resume-exp-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                        <p className={`text-sm font-semibold ${useResume ? 'text-white/94' : 'text-white/86'}`}>
                                          {normalizeImportText(entry.title) || 'Role not set'}
                                        </p>
                                        <p className="mt-1 text-sm text-white/70 break-all [overflow-wrap:anywhere]">
                                          {normalizeImportText(entry.company) || 'Company not set'}
                                        </p>
                                        <p className="mt-1 text-xs text-white/55">{formatExperienceDates(entry)}</p>
                                        {normalizeImportText(entry.description) ? (
                                          <p className="mt-2 text-sm leading-6 text-white/70 whitespace-pre-wrap break-words">
                                            {normalizeImportText(entry.description)}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className={`text-[15px] leading-7 ${useResume ? 'text-white/93' : 'text-white/83'}`}>Not set</p>
                                )
                              ) : (
                                <p className={`text-[15px] leading-7 whitespace-pre-wrap break-all [overflow-wrap:anywhere] ${useResume ? 'text-white/93' : 'text-white/83'}`}>{formatPreviewValue(item.resume_value)}</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Current</p>
                            <div className="rounded-xl border border-white/10 bg-white/[0.015] px-3.5 py-3">
                              {isEducation ? (
                                currentEducationEntries.length ? (
                                  <div className="space-y-2.5">
                                    {currentEducationEntries.map((entry, index) => (
                                      <div key={`current-edu-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                        <p className="text-sm font-semibold text-white/88">
                                          {entry.degree || 'Degree not set'}
                                          {entry.major ? ` - ${entry.major}` : ''}
                                        </p>
                                        <p className="mt-1 text-sm text-white/70 break-all [overflow-wrap:anywhere]">{entry.institution || 'Institution not set'}</p>
                                        <p className="mt-1 text-xs text-white/55">
                                          {(entry.start || entry.end) ? `${entry.start || 'N/A'} - ${entry.end || 'Present'}` : 'Dates not set'}
                                          {formatEducationScore(entry)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[15px] leading-7 text-white/78">Not set</p>
                                )
                              ) : isExperience ? (
                                currentExperienceEntries.length ? (
                                  <div className="space-y-2.5">
                                    {currentExperienceEntries.map((entry, index) => (
                                      <div key={`current-exp-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                        <p className="text-sm font-semibold text-white/88">
                                          {normalizeImportText(entry.title) || 'Role not set'}
                                        </p>
                                        <p className="mt-1 text-sm text-white/70 break-all [overflow-wrap:anywhere]">
                                          {normalizeImportText(entry.company) || 'Company not set'}
                                        </p>
                                        <p className="mt-1 text-xs text-white/55">{formatExperienceDates(entry)}</p>
                                        {normalizeImportText(entry.description) ? (
                                          <p className="mt-2 text-sm leading-6 text-white/70 whitespace-pre-wrap break-words">
                                            {normalizeImportText(entry.description)}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[15px] leading-7 text-white/78">Not set</p>
                                )
                              ) : (
                                <p className="text-[15px] leading-7 text-white/78 whitespace-pre-wrap break-all [overflow-wrap:anywhere]">{formatPreviewValue(item.current_value)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full rounded-xl border border-white/10 bg-white/[0.015] p-2.5">
                        <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Use value</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setImportSelections((current) => ({ ...current, [item.key]: true }))}
                            className={`rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${useResume ? 'bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)]' : 'border border-white/12 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white/88'}`}
                          >
                            Use resume
                          </button>
                          <button
                            type="button"
                            onClick={() => setImportSelections((current) => ({ ...current, [item.key]: false }))}
                            className={`rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${!useResume ? 'bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)]' : 'border border-white/12 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white/88'}`}
                          >
                            Keep current
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAnswerId !== null}
        title="Delete saved answer"
        message="This answer will be permanently removed and won't be available for future autofills."
        confirmLabel="Delete"
        danger
        onConfirm={deleteAnswer}
        onCancel={() => setConfirmAnswerId(null)}
      />

      <ConfirmDialog
        open={confirmExperienceIndex !== null}
        title="Delete experience entry"
        message="This experience entry will be permanently removed."
        confirmLabel="Delete"
        danger
        onConfirm={removeExperience}
        onCancel={() => setConfirmExperienceIndex(null)}
      />

      <ConfirmDialog
        open={confirmContactFieldId !== null}
        title="Delete contact field"
        message="This contact field will be permanently removed."
        confirmLabel="Delete"
        danger
        onConfirm={removeContactField}
        onCancel={() => setConfirmContactFieldId(null)}
      />

      <ConfirmDialog
        open={confirmEducationIndex !== null}
        title="Delete education entry"
        message="This education entry will be permanently removed."
        confirmLabel="Delete"
        danger
        onConfirm={removeEducation}
        onCancel={() => setConfirmEducationIndex(null)}
      />

      <ConfirmDialog
        open={confirmDeleteAllOpen}
        title="Delete all saved answers"
        message="This will permanently remove all saved answers used for autofill suggestions."
        confirmLabel={deletingAllAnswers ? 'Deleting...' : 'Delete All'}
        danger
        onConfirm={deleteAllAnswers}
        onCancel={() => !deletingAllAnswers && setConfirmDeleteAllOpen(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}

