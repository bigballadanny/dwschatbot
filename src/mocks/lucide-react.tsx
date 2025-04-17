
import React from 'react';

interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: number | string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
  color?: string;
}

// Helper function to create mock icons
const createIcon = (displayName: string) => {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, strokeWidth = 2, color = 'currentColor', ...rest }, ref) => {
      return (
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...rest}
        >
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
          <text
            x="12"
            y="14"
            fontSize="8"
            textAnchor="middle"
            fill={color}
            stroke="none"
          >
            {displayName}
          </text>
        </svg>
      );
    }
  );
  
  Icon.displayName = displayName;
  return Icon;
};

// Create and export all the icons used in the project
export const ArrowDown = createIcon('ArrowDown');
export const ArrowRight = createIcon('ArrowRight');
export const ArrowUp = createIcon('ArrowUp');
export const AlertCircle = createIcon('AlertCircle');
export const Check = createIcon('Check');
export const CheckCircle = createIcon('CheckCircle');
export const CheckCircle2 = createIcon('CheckCircle2');
export const ChevronDown = createIcon('ChevronDown');
export const ChevronLeft = createIcon('ChevronLeft');
export const ChevronRight = createIcon('ChevronRight');
export const ChevronUp = createIcon('ChevronUp');
export const Circle = createIcon('Circle');
export const Copy = createIcon('Copy');
export const File = createIcon('File');
export const FileType = createIcon('FileType');
export const Filter = createIcon('Filter');
export const Globe = createIcon('Globe');
export const HelpCircle = createIcon('HelpCircle');
export const Info = createIcon('Info');
export const Loader2 = createIcon('Loader2');
export const Menu = createIcon('Menu');
export const MessageSquare = createIcon('MessageSquare');
export const Moon = createIcon('Moon');
export const MoreHorizontal = createIcon('MoreHorizontal');
export const Paperclip = createIcon('Paperclip');
export const Play = createIcon('Play');
export const Plus = createIcon('Plus');
export const Search = createIcon('Search');
export const Send = createIcon('Send');
export const Settings = createIcon('Settings');
export const Sparkles = createIcon('Sparkles');
export const Sun = createIcon('Sun');
export const Tag = createIcon('Tag');
export const Trash = createIcon('Trash');
export const User = createIcon('User');
export const X = createIcon('X');
export const Calendar = createIcon('Calendar');
export const Home = createIcon('Home');
export const Inbox = createIcon('Inbox');
export const Upload = createIcon('Upload');
export const BookOpen = createIcon('BookOpen');
// Add all remaining icons
export const LucideIcon = createIcon('LucideIcon');
export const icons: Record<string, any> = {};

// Ensure we have many common icons
const commonIcons = [
  'Activity', 'AlertTriangle', 'Archive', 'ArrowLeft', 'Bell', 'BookmarkPlus',
  'Camera', 'Clock', 'Download', 'Edit', 'Eye', 'EyeOff', 'FileText', 'Folder',
  'Heart', 'Image', 'Link', 'List', 'Lock', 'LogOut', 'Mail', 'MapPin',
  'Maximize', 'Minimize', 'Monitor', 'Pause', 'Phone', 'Power', 'Save',
  'Share', 'ShieldCheck', 'Star', 'ThumbsUp', 'Trash2', 'UploadCloud', 'Video',
  'Volume', 'VolumeX', 'Zap', 'Zoom', 'Mic', 'MicOff', 'LogIn', 'XCircle'
];

commonIcons.forEach(name => {
  const icon = createIcon(name);
  exports[name] = icon;
  icons[name] = icon;
});
