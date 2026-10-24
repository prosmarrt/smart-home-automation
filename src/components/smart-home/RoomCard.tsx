import { Home, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Room } from '@/types/types';

interface RoomCardProps {
  room: Room;
  deviceCount: number;
  onEdit: (room: Room) => void;
  onDelete: (roomId: string) => void;
}

export default function RoomCard({ room, deviceCount, onEdit, onDelete }: RoomCardProps) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
            <p className="text-sm text-muted-foreground">{deviceCount} devices</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => onEdit(room)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(room.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
