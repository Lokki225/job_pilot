"use client";

/**
 * Calendar dialogs.
 *
 * Parent components own open-state and form-state; these components only render UI.
 */

import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CALENDAR_CATEGORY_OPTIONS, type CalendarCategory } from "@/components/calendar/categories";

export function CreateEventDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPrefillToday: () => void;

  title: string;
  setTitle: (v: string) => void;

  category: CalendarCategory;
  setCategory: (v: CalendarCategory) => void;

  description: string;
  setDescription: (v: string) => void;

  location: string;
  setLocation: (v: string) => void;

  startAt: string;
  setStartAt: (v: string) => void;

  endAt: string;
  setEndAt: (v: string) => void;

  timezone: string;

  applyDurationToCreate: (minutes: number) => void;

  remind15m: boolean;
  setRemind15m: (v: boolean) => void;
  remind1h: boolean;
  setRemind1h: (v: boolean) => void;
  remind1d: boolean;
  setRemind1d: (v: boolean) => void;

  enableCustomReminder: boolean;
  setEnableCustomReminder: (v: boolean) => void;
  customRemindAt: string;
  setCustomRemindAt: (v: string) => void;

  isCreating: boolean;
  onCreate: () => void;
}) {
  const {
    open,
    onOpenChange,
    onOpenPrefillToday,
    title,
    setTitle,
    category,
    setCategory,
    description,
    setDescription,
    location,
    setLocation,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    timezone,
    applyDurationToCreate,
    remind15m,
    setRemind15m,
    remind1h,
    setRemind1h,
    remind1d,
    setRemind1d,
    enableCustomReminder,
    setEnableCustomReminder,
    customRemindAt,
    setCustomRemindAt,
    isCreating,
    onCreate,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            onOpenPrefillToday();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CalendarCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quick duration</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => applyDurationToCreate(15)}>
                  15m
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyDurationToCreate(30)}>
                  30m
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyDurationToCreate(60)}>
                  1h
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyDurationToCreate(120)}>
                  2h
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startAt">Start</Label>
              <Input id="startAt" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endAt">End</Label>
              <Input id="endAt" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">Timezone: {timezone}</div>

          <div className="space-y-3 rounded-md border p-3">
            <div className="text-sm font-medium">Reminders</div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">15 minutes before</div>
              <Switch checked={remind15m} onCheckedChange={setRemind15m} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">1 hour before</div>
              <Switch checked={remind1h} onCheckedChange={setRemind1h} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">1 day before</div>
              <Switch checked={remind1d} onCheckedChange={setRemind1d} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Custom reminder</div>
              <Switch
                checked={enableCustomReminder}
                onCheckedChange={(v) => {
                  setEnableCustomReminder(v);
                  if (!v) setCustomRemindAt("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customRemindAt">Remind at</Label>
              <Input
                id="customRemindAt"
                type="datetime-local"
                value={customRemindAt}
                disabled={!enableCustomReminder}
                onChange={(e) => setCustomRemindAt(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={isCreating || !title.trim() || !startAt || !endAt}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditEventDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  editTitle: string;
  setEditTitle: (v: string) => void;

  editCategory: CalendarCategory;
  setEditCategory: (v: CalendarCategory) => void;

  editDescription: string;
  setEditDescription: (v: string) => void;

  editLocation: string;
  setEditLocation: (v: string) => void;

  editStartAt: string;
  setEditStartAt: (v: string) => void;

  editEndAt: string;
  setEditEndAt: (v: string) => void;

  timezone: string;

  applyDurationToEdit: (minutes: number) => void;

  isUpdating: boolean;
  onSave: () => void;
}) {
  const {
    open,
    onOpenChange,
    editTitle,
    setEditTitle,
    editCategory,
    setEditCategory,
    editDescription,
    setEditDescription,
    editLocation,
    setEditLocation,
    editStartAt,
    setEditStartAt,
    editEndAt,
    setEditEndAt,
    timezone,
    applyDurationToEdit,
    isUpdating,
    onSave,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="editTitle">Title</Label>
            <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={(v) => setEditCategory(v as CalendarCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quick duration</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => applyDurationToEdit(15)}>
                  15m
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyDurationToEdit(30)}>
                  30m
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyDurationToEdit(60)}>
                  1h
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyDurationToEdit(120)}>
                  2h
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editDescription">Description</Label>
            <Textarea
              id="editDescription"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editLocation">Location</Label>
            <Input id="editLocation" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editStartAt">Start</Label>
              <Input
                id="editStartAt"
                type="datetime-local"
                value={editStartAt}
                onChange={(e) => setEditStartAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEndAt">End</Label>
              <Input id="editEndAt" type="datetime-local" value={editEndAt} onChange={(e) => setEditEndAt(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">Timezone: {timezone}</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isUpdating || !editTitle.trim() || !editStartAt || !editEndAt}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteEventDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteEventTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
}) {
  const { open, onOpenChange, deleteEventTitle, isDeleting, onConfirm } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete event</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">
          This will permanently delete <span className="font-medium text-foreground">{deleteEventTitle}</span>.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
