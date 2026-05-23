"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Calendar,
  Loader2,
  Search,
  ChevronRight,
  ListTodo,
} from "lucide-react";
import {
  createStudyPlan,
  getStudyPlans,
  getStudyPlanDetail,
  addPlanItem,
  updatePlanItemStatus,
  removePlanItem,
  deleteStudyPlan,
  searchQuestionsForPlan,
} from "@/actions/study-planner";
import { useSession } from "@/lib/auth-client";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function StudyPlanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<
    { id: string; name: string; weekStart: Date; itemCount: number; completedCount: number; createdAt: Date }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planDetail, setPlanDetail] = useState<{
    id: string;
    name: string;
    weekStart: Date;
    items: {
      id: string;
      questionId: string;
      questionTitle: string;
      leetcodeUrl: string;
      difficulty: string;
      dayOfWeek: number;
      status: string;
      notes: string | null;
      sortOrder: number;
    }[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addDay, setAddDay] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; title: string; difficulty: string; leetcodeUrl: string }[]
  >([]);
  const [searching, setSearching] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const result = await getStudyPlans();
    if (result.success) {
      setPlans(result.data.plans);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const fetchDetail = useCallback(async (planId: string) => {
    setDetailLoading(true);
    const result = await getStudyPlanDetail(planId);
    if (result.success) {
      setPlanDetail(result.data);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchDetail(selectedPlanId);
    }
  }, [selectedPlanId, fetchDetail]);

  const handleCreate = useCallback(async () => {
    if (!newPlanName.trim()) return;

    // Default to current Monday
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const result = await createStudyPlan(newPlanName.trim(), monday.toISOString());
    if (result.success) {
      setCreateOpen(false);
      setNewPlanName("");
      await fetchPlans();
      setSelectedPlanId(result.data.id);
    }
  }, [newPlanName, fetchPlans]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const result = await searchQuestionsForPlan(q.trim());
    if (result.success) {
      setSearchResults(result.data.questions);
    }
    setSearching(false);
  }, []);

  const handleAddItem = useCallback(
    async (questionId: string) => {
      if (!selectedPlanId) return;
      const result = await addPlanItem(selectedPlanId, questionId, addDay);
      if (result.success) {
        setAddItemOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        await fetchDetail(selectedPlanId);
      }
    },
    [selectedPlanId, addDay, fetchDetail],
  );

  const handleToggleStatus = useCallback(
    async (itemId: string, currentStatus: string) => {
      const newStatus = currentStatus === "completed" ? "planned" : "completed";
      const result = await updatePlanItemStatus(itemId, newStatus);
      if (result.success && selectedPlanId) {
        await fetchDetail(selectedPlanId);
      }
    },
    [selectedPlanId, fetchDetail],
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      const result = await removePlanItem(itemId);
      if (result.success && selectedPlanId) {
        await fetchDetail(selectedPlanId);
      }
    },
    [selectedPlanId, fetchDetail],
  );

  const handleDeletePlan = useCallback(
    async (planId: string) => {
      const result = await deleteStudyPlan(planId);
      if (result.success) {
        setSelectedPlanId(null);
        setPlanDetail(null);
        await fetchPlans();
      }
    },
    [fetchPlans],
  );

  if (!session?.user) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="py-12 text-center">
          <ListTodo className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Sign in to create study plans.</p>
        </CardContent>
      </Card>
    );
  }

  const difficultyColor = (d: string) => {
    switch (d) {
      case "EASY": return "bg-green-500/20 text-green-400";
      case "MEDIUM": return "bg-amber-500/20 text-amber-400";
      case "HARD": return "bg-red-500/20 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Study Planner</h1>
          <p className="text-sm text-muted-foreground">Plan your weekly practice sessions</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Study Plan</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              <Input
                placeholder="Plan name (e.g., Week 1 - Arrays)"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={!newPlanName.trim()}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Plans list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No study plans yet. Create one to get started!
              </p>
            ) : (
              plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPlanId === plan.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{plan.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(plan.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span>
                      {plan.completedCount}/{plan.itemCount} done
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Plan detail */}
        <Card>
          {!selectedPlanId ? (
            <CardContent className="py-12 text-center">
              <ListTodo className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a plan to view its details</p>
            </CardContent>
          ) : detailLoading ? (
            <CardContent className="py-8 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          ) : planDetail ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{planDetail.name}</CardTitle>
                  <CardDescription>
                    Week of {new Date(planDetail.weekStart).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePlan(planDetail.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {DAY_NAMES.map((dayName, dayIdx) => {
                  const dayItems = planDetail.items
                    .filter((i) => i.dayOfWeek === dayIdx)
                    .sort((a, b) => a.sortOrder - b.sortOrder);
                  return (
                    <div key={dayName}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                          {dayName}
                          <span className="text-xs text-muted-foreground font-normal">
                            ({dayItems.filter((i) => i.status === "completed").length}/{dayItems.length})
                          </span>
                        </h3>
                        <Dialog open={addItemOpen && addDay === dayIdx} onOpenChange={(open) => {
                          setAddItemOpen(open);
                          if (open) setAddDay(dayIdx);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7">
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Question to {dayName}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-3 pt-2">
                              <Input
                                placeholder="Search questions..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                              />
                              <div className="max-h-60 overflow-y-auto space-y-1">
                                {searching ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                  </div>
                                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No questions found
                                  </p>
                                ) : (
                                  searchResults.map((q) => (
                                    <button
                                      key={q.id}
                                      type="button"
                                      onClick={() => handleAddItem(q.id)}
                                      className="w-full text-left p-2 rounded-md hover:bg-muted text-sm flex items-center justify-between gap-2"
                                    >
                                      <span className="truncate flex-1">{q.title}</span>
                                      <Badge variant="outline" className={`text-[10px] ${difficultyColor(q.difficulty)}`}>
                                        {q.difficulty}
                                      </Badge>
                                    </button>
                                  ))
                                )}
                                {searchQuery.length < 2 && (
                                  <p className="text-xs text-muted-foreground text-center py-4">
                                    Type at least 2 characters to search
                                  </p>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {dayItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-4">No questions planned</p>
                      ) : (
                        <div className="space-y-1 pl-4">
                          {dayItems.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-2 p-2 rounded-md border text-sm ${
                                item.status === "completed"
                                  ? "border-green-500/30 bg-green-500/5"
                                  : "border-border"
                              }`}
                            >
                              <Checkbox
                                checked={item.status === "completed"}
                                onCheckedChange={() => handleToggleStatus(item.id, item.status)}
                              />
                              <a
                                href={item.leetcodeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex-1 truncate hover:underline ${
                                  item.status === "completed" ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {item.questionTitle}
                              </a>
                              <Badge variant="outline" className={`text-[10px] ${difficultyColor(item.difficulty)}`}>
                                {item.difficulty}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
