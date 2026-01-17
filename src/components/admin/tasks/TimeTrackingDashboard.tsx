import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  BarChart3,
  Calendar
} from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, isWithinInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface TimeEntryWithDetails {
  id: string;
  task_id: string;
  user_id: string;
  hours: number;
  description: string | null;
  logged_at: string;
  created_at: string;
  task_title: string;
  user_name: string | null;
  user_email: string | null;
}

const useAllTimeEntries = () => {
  return useQuery({
    queryKey: ['all-time-entries'],
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from('task_time_entries')
        .select('*')
        .order('logged_at', { ascending: false });

      if (error) throw error;

      // Fetch tasks and profiles
      const taskIds = [...new Set(entries?.map(e => e.task_id) || [])];
      const userIds = [...new Set(entries?.map(e => e.user_id) || [])];

      const [tasksRes, profilesRes] = await Promise.all([
        supabase.from('admin_tasks').select('id, title').in('id', taskIds),
        supabase.from('profiles').select('id, full_name, email').in('id', userIds),
      ]);

      const taskMap = new Map((tasksRes.data || []).map(t => [t.id, t.title]));
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, { name: p.full_name, email: p.email }]));

      return (entries || []).map(entry => ({
        ...entry,
        task_title: taskMap.get(entry.task_id) || 'Unknown Task',
        user_name: profileMap.get(entry.user_id)?.name || null,
        user_email: profileMap.get(entry.user_id)?.email || null,
      })) as TimeEntryWithDetails[];
    },
  });
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const TimeTrackingDashboard = () => {
  const { data: timeEntries = [], isLoading } = useAllTimeEntries();

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const last7Days = subDays(now, 7);

    const thisWeekEntries = timeEntries.filter(e => {
      const date = new Date(e.logged_at);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });

    const last7DaysEntries = timeEntries.filter(e => {
      const date = new Date(e.logged_at);
      return date >= last7Days;
    });

    const totalHours = timeEntries.reduce((sum, e) => sum + Number(e.hours), 0);
    const thisWeekHours = thisWeekEntries.reduce((sum, e) => sum + Number(e.hours), 0);
    const uniqueUsers = new Set(timeEntries.map(e => e.user_id)).size;
    const uniqueTasks = new Set(timeEntries.map(e => e.task_id)).size;

    // Hours by day for chart (last 7 days)
    const days = eachDayOfInterval({ start: last7Days, end: now });
    const hoursByDay = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const hours = timeEntries
        .filter(e => e.logged_at === dayStr)
        .reduce((sum, e) => sum + Number(e.hours), 0);
      return {
        day: format(day, 'EEE'),
        hours: Number(hours.toFixed(1)),
      };
    });

    // Hours by user
    const hoursByUser: Record<string, number> = {};
    timeEntries.forEach(e => {
      const key = e.user_name || e.user_email || 'Unknown';
      hoursByUser[key] = (hoursByUser[key] || 0) + Number(e.hours);
    });
    const userChartData = Object.entries(hoursByUser)
      .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    // Hours by task
    const hoursByTask: Record<string, number> = {};
    timeEntries.forEach(e => {
      hoursByTask[e.task_title] = (hoursByTask[e.task_title] || 0) + Number(e.hours);
    });
    const taskChartData = Object.entries(hoursByTask)
      .map(([name, hours]) => ({ name: name.slice(0, 20), hours: Number(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    return {
      totalHours,
      thisWeekHours,
      uniqueUsers,
      uniqueTasks,
      hoursByDay,
      userChartData,
      taskChartData,
      recentEntries: timeEntries.slice(0, 10),
    };
  }, [timeEntries]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Total Hours Logged</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.thisWeekHours.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              <p className="text-sm text-muted-foreground">Contributors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CheckCircle2 className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uniqueTasks}</p>
              <p className="text-sm text-muted-foreground">Tasks Tracked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Hours by Day (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hoursByDay}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}h`, 'Hours']}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Hours by Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {stats.userChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.userChartData}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, hours }) => `${name}: ${hours}h`}
                      labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    >
                      {stats.userChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}h`, 'Hours']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No time entries yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Tasks & Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Tasks by Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {stats.taskChartData.length > 0 ? (
                  stats.taskChartData.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium truncate flex-1">{task.name}</span>
                      <span className="text-muted-foreground ml-2">{task.hours}h</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No time entries yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Recent Time Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {stats.recentEntries.length > 0 ? (
                  stats.recentEntries.map((entry) => (
                    <div key={entry.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{entry.task_title}</span>
                        <span className="text-primary font-semibold">{Number(entry.hours).toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                        <span>{entry.user_name || entry.user_email}</span>
                        <span>{format(new Date(entry.logged_at), 'MMM d, yyyy')}</span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{entry.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No time entries yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
