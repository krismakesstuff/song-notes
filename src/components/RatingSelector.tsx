import { Star } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useDB } from '@hooks/useDB';

/**
 * Rating selector component - allows users to rate versions with 1-5 stars
 */
interface RatingSelectorProps {
  versionId: number;
  currentRating: number | null;
}

export default function RatingSelector({ versionId, currentRating }: RatingSelectorProps) {
  const dbOps = useDB();
  const { updateVersionRating } = useAppStore();

  const handleRating = async (rating: number) => {
    // If clicking the same rating, clear it
    const newRating = rating === currentRating ? null : rating;

    try {
      await dbOps.updateVersionRating(versionId, newRating);
      updateVersionRating(versionId, newRating);
    } catch (error) {
      console.error('Failed to update rating:', error);
    }
  };

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = currentRating !== null && starValue <= currentRating;

        return (
          <button
            key={i}
            onClick={() => handleRating(starValue)}
            className="p-1 hover:scale-110 transition-transform"
            title={`${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <Star
              size={18}
              className={
                isFilled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-600 hover:text-yellow-400'
              }
            />
          </button>
        );
      })}
    </div>
  );
}
