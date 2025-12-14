"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Mail, Smartphone, Clock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationCategories,
  toggleCategoryMute,
  setQuietHours,
  setEmailDigestFrequency,
  resetNotificationPreferences,
  type NotificationPreferencesData,
} from "@/lib/actions/notification-preferences.action";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/types/app-events";

interface CategoryItem {
  category: EventCategory;
  label: string;
  icon: string;
  description: string;
  isMuted: boolean;
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferencesData | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    setIsLoading(true);
    try {
      const [prefsResult, catsResult] = await Promise.all([
        getNotificationPreferences(),
        getNotificationCategories(),
      ]);

      if (prefsResult.data) {
        setPreferences(prefsResult.data);
        setQuietStart(prefsResult.data.quietHoursStart || "");
        setQuietEnd(prefsResult.data.quietHoursEnd || "");
      }

      if (catsResult.data) {
        setCategories(catsResult.data);
      }
    } catch (err) {
      console.error("Error loading preferences:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleChannel(
    channel: "emailEnabled" | "pushEnabled" | "inAppEnabled"
  ) {
    if (!preferences) return;

    setIsSaving(true);
    try {
      const newValue = !preferences[channel];
      const result = await updateNotificationPreferences({ [channel]: newValue });
      if (result.data) {
        setPreferences(result.data);
      }
    } catch (err) {
      console.error("Error updating channel:", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleCategory(category: EventCategory) {
    setIsSaving(true);
    try {
      await toggleCategoryMute(category);
      // Refresh categories
      const result = await getNotificationCategories();
      if (result.data) {
        setCategories(result.data);
      }
    } catch (err) {
      console.error("Error toggling category:", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveQuietHours() {
    setIsSaving(true);
    try {
      await setQuietHours(
        quietStart || null,
        quietEnd || null,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );
      await loadPreferences();
    } catch (err) {
      console.error("Error saving quiet hours:", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDigestChange(frequency: "instant" | "daily" | "weekly" | "never") {
    setIsSaving(true);
    try {
      await setEmailDigestFrequency(frequency);
      await loadPreferences();
    } catch (err) {
      console.error("Error updating digest frequency:", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("Reset all notification preferences to defaults?")) return;

    setIsSaving(true);
    try {
      await resetNotificationPreferences();
      await loadPreferences();
    } catch (err) {
      console.error("Error resetting preferences:", err);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">In-App Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Show notifications in the app
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.inAppEnabled ?? true}
              onCheckedChange={() => handleToggleChannel("inAppEnabled")}
              disabled={isSaving}
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-green-500" />
              <div>
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.emailEnabled ?? true}
              onCheckedChange={() => handleToggleChannel("emailEnabled")}
              disabled={isSaving}
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-purple-500" />
              <div>
                <Label className="text-sm font-medium">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified on your device (coming soon)
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.pushEnabled ?? true}
              onCheckedChange={() => handleToggleChannel("pushEnabled")}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>
            Mute specific types of notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.category}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                <div>
                  <Label className="text-sm font-medium">{cat.label}</Label>
                  <p className="text-xs text-muted-foreground">
                    {cat.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cat.isMuted && (
                  <Badge variant="secondary" className="text-xs">
                    <BellOff className="h-3 w-3 mr-1" />
                    Muted
                  </Badge>
                )}
                <Switch
                  checked={!cat.isMuted}
                  onCheckedChange={() => handleToggleCategory(cat.category)}
                  disabled={isSaving}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause non-urgent notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Start Time</Label>
              <Input
                id="quiet-start"
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                placeholder="22:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">End Time</Label>
              <Input
                id="quiet-end"
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                placeholder="07:00"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveQuietHours}
            disabled={isSaving}
            variant="outline"
            size="sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Quiet Hours
          </Button>
          {preferences?.quietHoursStart && preferences?.quietHoursEnd && (
            <p className="text-xs text-muted-foreground">
              Currently set: {preferences.quietHoursStart} - {preferences.quietHoursEnd}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Digest
          </CardTitle>
          <CardDescription>
            How often should we send email summaries?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences?.emailDigestFrequency || "instant"}
            onValueChange={(value) =>
              handleDigestChange(value as "instant" | "daily" | "weekly" | "never")
            }
            disabled={isSaving}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant (send immediately)</SelectItem>
              <SelectItem value="daily">Daily Digest</SelectItem>
              <SelectItem value="weekly">Weekly Summary</SelectItem>
              <SelectItem value="never">Never (disable emails)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Reset */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
