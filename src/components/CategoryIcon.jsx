import { 
  Brain, 
  Baby, 
  BookOpen, 
  Briefcase, 
  BookMarked, 
  Users, 
  Lightbulb, 
  Gamepad2, 
  PackageSearch, 
  Globe2, 
  BookText 
} from 'lucide-react';

const ICON_MAP = {
  'ky-nang-song': { icon: Brain, color: '#e91e63', bg: '#fce4ec' },
  'sach-thieu-nhi': { icon: Baby, color: '#f57c00', bg: '#fff3e0' },
  'giao-khoa': { icon: BookOpen, color: '#1976d2', bg: '#e3f2fd' },
  'quan-tri': { icon: Briefcase, color: '#455a64', bg: '#eceff1' },
  'van-hoc': { icon: BookMarked, color: '#7b1fa2', bg: '#f3e5f5' },
  'nuoi-day-con': { icon: Users, color: '#388e3c', bg: '#e8f5e9' },
  'tam-ly-hoc': { icon: Lightbulb, color: '#fbc02d', bg: '#fffde7' },
  'do-choi': { icon: Gamepad2, color: '#d32f2f', bg: '#ffebee' },
  'combo': { icon: PackageSearch, color: '#795548', bg: '#efebe9' },
  'tieng-anh': { icon: Globe2, color: '#0288d1', bg: '#e1f5fe' },
};

const DEFAULT_STYLE = { icon: BookText, color: '#607d8b', bg: '#eceff1' };

export default function CategoryIcon({ slug, size = 28, className = '', withBackground = false }) {
  const style = ICON_MAP[slug] || DEFAULT_STYLE;
  const IconComponent = style.icon;

  if (withBackground) {
    return (
      <div 
        className={`cat-icon-wrapper ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size * 1.8,
          height: size * 1.8,
          borderRadius: '25%', // slight squircle effect
          backgroundColor: style.bg,
          color: style.color,
          transition: 'all 0.3s ease'
        }}
      >
        <IconComponent size={size} strokeWidth={1.5} />
      </div>
    );
  }

  return <IconComponent size={size} className={className} color={style.color} strokeWidth={1.5} />;
}
