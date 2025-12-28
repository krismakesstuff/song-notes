import { VersionFormat } from '@lib/db';
import { formatFormatLabel } from '@lib/formatUtils';

/**
 * Format selector dropdown - allows user to choose which format to play
 * Displays format, file size, and bitrate for each option
 */
interface FormatSelectorProps {
  versionId: number;
  formats: VersionFormat[];
  selectedIndex: number;
  onFormatChange: (index: number) => void;
}

export default function FormatSelector({
  formats,
  selectedIndex,
  onFormatChange,
}: FormatSelectorProps) {
  if (formats.length <= 1) return null;

  return (
    <select
      value={selectedIndex}
      onChange={(e) => onFormatChange(parseInt(e.target.value))}
      className="select-styled text-xs pl-2 py-1 min-w-[180px]"
      title={`${formats.length} formats available`}
    >
      {formats.map((format, index) => (
        <option key={index} value={index}>
          {formatFormatLabel(format)}
        </option>
      ))}
    </select>
  );
}
