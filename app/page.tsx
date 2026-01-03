"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, ListTodo, BarChart3, Clock, CheckCircle2, AlertCircle, Building2, Briefcase, Calendar, DollarSign, Package, FileText, Users, Flag, ClipboardCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/imageCompression";
import { collection, addDoc, deleteDoc, doc, orderBy, onSnapshot, updateDoc, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/types/task";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { TaskGrid } from "@/components/tasks/TaskGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { Switch } from "@/components/ui/switch";


export default function Home() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Task state
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Shared state
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showRevenue, setShowRevenue] = useState(false);

  // Metrics
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    projects: 0,
    jobs: 0
  });

  // Additional metrics
  const [additionalMetrics, setAdditionalMetrics] = useState({
    totalValue: 0,
    confirmedValue: 0,
    materialTasks: 0,
    documentsCount: 0,
    avgCompletionTime: 0,
    confirmedTasks: 0,
    highPriorityTasks: 0,
    projectsInProgress: 0
  });

  // Update metrics calculation
  useEffect(() => {
    const newMetrics = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      notStarted: tasks.filter(t => t.status === 'not-initiated').length,
      projects: tasks.filter(t => t.type === 'project').length,
      jobs: tasks.filter(t => t.type === 'job').length
    };
    setMetrics(newMetrics);

    // Calculate additional metrics
    const newAdditionalMetrics = {
      totalValue: tasks.reduce((sum, task) => sum + (task.quotedPrice || 0), 0),
      confirmedValue: tasks.reduce((sum, task) => sum + (task.confirmedPrice || 0), 0),
      materialTasks: tasks.filter(t => t.requiresMaterial).length,
      documentsCount: tasks.reduce((sum, task) => sum + task.images.length, 0),
      confirmedTasks: tasks.filter(t => t.workConfirmationStatus === 'confirmed').length,
      highPriorityTasks: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      projectsInProgress: tasks.filter(t => t.type === 'project' && t.status === 'in-progress').length,
      avgCompletionTime: calculateAverageCompletionTime(tasks)
    };
    setAdditionalMetrics(newAdditionalMetrics);
  }, [tasks]);

  // Calculate average completion time
  const calculateAverageCompletionTime = (tasks: Task[]) => {
    const completedTasks = tasks.filter(t => t.dateCompleted && t.dateInitiated);
    if (completedTasks.length === 0) return 0;

    const totalDays = completedTasks.reduce((sum, task) => {
      const completionTime = task.dateCompleted!.getTime() - task.dateInitiated!.getTime();
      return sum + (completionTime / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0);

    return Math.round(totalDays / completedTasks.length);
  };

  // Calculate task data based on time range
  const getTaskData = () => {
    switch (timeRange) {
      case 'daily':
        return Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), i);
          return {
            date: format(date, 'MMM dd'),
            tasks: tasks.filter(task => {
              const taskDate = task.createdAt;
              return taskDate >= startOfDay(date) && taskDate <= endOfDay(date);
            }).length
          };
        }).reverse();

      case 'weekly':
        return Array.from({ length: 4 }, (_, i) => {
          const endDate = subDays(new Date(), i * 7);
          const startDate = subDays(endDate, 6);
          return {
            date: `Week ${4 - i}`,
            tasks: tasks.filter(task => {
              const taskDate = task.createdAt;
              return taskDate >= startOfDay(startDate) && taskDate <= endOfDay(endDate);
            }).length
          };
        }).reverse();

      case 'monthly':
        return Array.from({ length: 6 }, (_, i) => {
          const date = subMonths(new Date(), i);
          return {
            date: format(date, 'MMM'),
            tasks: tasks.filter(task => {
              const taskDate = task.createdAt;
              return taskDate >= startOfMonth(date) && taskDate <= endOfMonth(date);
            }).length
          };
        }).reverse();
    }
  };

  // Calculate status distribution
  const getStatusDistribution = () => {
    return [
      { name: 'Completed', value: metrics.completed },
      { name: 'In Progress', value: metrics.inProgress },
      { name: 'Not Started', value: metrics.notStarted }
    ];
  };

  // Calculate type distribution
  const getTypeDistribution = () => {
    return [
      { name: 'Projects', value: metrics.projects },
      { name: 'Jobs', value: metrics.jobs }
    ];
  };

  // Priority distribution
  const getPriorityDistribution = () => {
    const distribution = {
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    };

    return Object.entries(distribution).map(([priority, count]) => ({
      priority: priority.charAt(0).toUpperCase() + priority.slice(1),
      count
    }));
  };

  // Chart colors
  const CHART_COLORS = {
    primary: 'hsl(var(--chart-1))',
    secondary: 'hsl(var(--chart-2))',
    tertiary: 'hsl(var(--chart-3))',
    quaternary: 'hsl(var(--chart-4))',
    quinary: 'hsl(var(--chart-5))',
    senary: 'hsl(var(--chart-6))',
    septenary: 'hsl(var(--chart-7))',
    octonary: 'hsl(var(--chart-8))'
  };

  const PIE_COLORS = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.tertiary,
    CHART_COLORS.quaternary,
    CHART_COLORS.quinary,
    CHART_COLORS.senary,
    CHART_COLORS.septenary,
    CHART_COLORS.octonary
  ];

  // Redirect if not authenticated
  useEffect(() => {
    if (!user || !userData) {
      router.push("/auth");
    }
  }, [user, userData, router]);

  // Set up tasks listener
  useEffect(() => {
    if (!user || !userData) return;

    let unsubscribe: () => void;

    const setupTasksListener = async () => {
      try {
        const tasksRef = collection(db, "tasks");
        const tasksQuery = query(tasksRef, orderBy("createdAt", "desc"));

        unsubscribe = onSnapshot(
          tasksQuery,
          (snapshot) => {
            const taskList = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
                dateInitiated: data.dateInitiated?.toDate() || null,
                dateCompleted: data.dateCompleted?.toDate() || null,
                timeSlots: data.timeSlots || [],
                type: data.type || 'job',
                source: data.source || 'call',
                priority: data.priority || 'medium',
                requiresMaterial: data.requiresMaterial || false,
                materialStatus: data.materialStatus || null,
                materialDescription: data.materialDescription || '',
                quotedPrice: data.quotedPrice || null,
                confirmedPrice: data.confirmedPrice || null,
                workConfirmationStatus: data.workConfirmationStatus || 'awaiting',
                poNumber: data.poNumber || null
              };
            }) as Task[];

            setTasks(taskList);
            setIsLoading(false);
          },
          (error) => {
            console.error("Error fetching tasks:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to load tasks. Please try again.",
            });
            setIsLoading(false);
          }
        );
      } catch (error) {
        console.error("Error setting up tasks query:", error);
        setIsLoading(false);
      }
    };

    setupTasksListener();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userData, toast]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      toast({
        title: "Success",
        description: "Task deleted successfully!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete task",
      });
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!user) return;

    try {
      const { 
        title, 
        site, 
        description, 
        notes, 
        status, 
        timeSlots, 
        images: newImages, 
        existingImages, 
        type, 
        source, 
        priority, 
        dateInitiated, 
        dateCompleted,
        requiresMaterial,
        materialStatus,
        materialDescription,
        quotedPrice,
        confirmedPrice,
        workConfirmationStatus,
        poNumber
      } = taskData;
      
      let allImages = existingImages || [];
      if (newImages && newImages.length > 0) {
        const uploadPromises = newImages.map(async (file, index) => {
          const imagePath = `tasks/${user.uid}/${Date.now()}-${index}-${file.name}`;
          return uploadImage(file, imagePath);
        });
        const newImageUrls = await Promise.all(uploadPromises);
        allImages = [...allImages, ...newImageUrls];
      }

      // Create the base task object without the poNumber field
      const taskToSave = {
        title: title || '',
        site: site || '',
        description: description || '',
        notes: notes || '',
        status: status || 'in-progress',
        timeSlots: timeSlots || [],
        images: allImages,
        uploaderEmail: user.email || '',
        updatedAt: new Date(),
        type: type || 'job',
        source: source || 'call',
        priority: priority || 'medium',
        dateInitiated: dateInitiated || null,
        dateCompleted: dateCompleted || null,
        requiresMaterial: requiresMaterial || false,
        materialStatus: requiresMaterial ? materialStatus : null,
        materialDescription: requiresMaterial ? materialDescription || '' : '',
        quotedPrice: quotedPrice || null,
        confirmedPrice: confirmedPrice || null,
        workConfirmationStatus: workConfirmationStatus || 'awaiting'
      };

      // Only add poNumber to the object if it has a non-empty value
      if (poNumber?.trim()) {
        Object.assign(taskToSave, { poNumber: poNumber.trim() });
      }
      
      if (editingTask) {
        await updateDoc(doc(db, "tasks", editingTask.id), taskToSave);
        setEditingTask(null);
        toast({
          title: "Success",
          description: "Task updated successfully!",
        });
      } else {
        await addDoc(collection(db, "tasks"), {
          ...taskToSave,
          userId: user.uid,
          createdAt: new Date(),
        });
        toast({
          title: "Success",
          description: "Task added successfully!",
        });
      }
      setIsTaskDialogOpen(false);
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: editingTask ? "Failed to update task" : "Failed to add task",
      });
    }
  };

  if (!user || !userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {userData?.name || 'Admin'}</h1>
            <p className="text-sm text-gray-600 mt-1">Administrator Dashboard</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
        
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Work Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Revenue Toggle */}
            <div className="flex items-center justify-end space-x-2">
              {showRevenue ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">Show Revenue</span>
              <Switch
                checked={showRevenue}
                onCheckedChange={setShowRevenue}
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.projects} Projects, {metrics.jobs} Jobs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.inProgress}</div>
                  <p className="text-xs text-muted-foreground">
                    Active tasks being worked on
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.completed}</div>
                  <p className="text-xs text-muted-foreground">
                    Successfully completed tasks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Not Started</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.notStarted}</div>
                  <p className="text-xs text-muted-foreground">
                    Tasks yet to be initiated
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Task Trend */}
              <Card className="col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Task Trend</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant={timeRange === 'daily' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange('daily')}
                      className="text-xs h-7"
                    >
                      Daily
                    </Button>
                    <Button
                      variant={timeRange === 'weekly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange('weekly')}
                      className="text-xs h-7"
                    >
                      Weekly
                    </Button>
                    <Button
                      variant={timeRange === 'monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange('monthly')}
                      className="text-xs h-7"
                    >
                      Monthly
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getTaskData()}>
                        <defs>
                          <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="tasks"
                          stroke={CHART_COLORS.primary}
                          fill="url(#colorTasks)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getPriorityDistribution()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="priority" type="category" tick={{ fontSize: 12 }} width={60} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill={CHART_COLORS.secondary}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Distribution Charts */}
              <Card>
  <CardHeader>
    <CardTitle className="text-sm font-medium">Distribution</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[...getStatusDistribution(), ...getTypeDistribution()]}
            cx="50%"
            cy="50%"
            innerRadius={20}
            outerRadius={40}
            paddingAngle={5}
            dataKey="value"
            label={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              percent,
              index,
              name,
              value
            }) => {
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);

              return (
                <text
                  x={x}
                  y={y}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                  textAnchor={x > cx ? 'start' : 'end'}
                  dominantBaseline="central"
                  fontSize="10"
                  fontWeight="500"
                >
                  {`${name}: ${value}`}
                </text>
              );
            }}
            labelLine={false}
          >
            {[...getStatusDistribution(), ...getTypeDistribution()].map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={PIE_COLORS[index % PIE_COLORS.length]}
                strokeWidth={1}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip wrapperStyle={{ display: 'none' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
            </div>

            {/* Additional Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {showRevenue && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${additionalMetrics.totalValue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Quoted value of all tasks
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Confirmed Value</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${additionalMetrics.confirmedValue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Total confirmed revenue
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Material Tasks</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{additionalMetrics.materialTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    Tasks requiring materials
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{additionalMetrics.documentsCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Total uploaded documents
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{additionalMetrics.avgCompletionTime}</div>
                  <p className="text-xs text-muted-foreground">
                    Average days to complete
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confirmed Tasks</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{additionalMetrics.confirmedTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    Work confirmation received
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                  <Flag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{additionalMetrics.highPriorityTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    High/Urgent priority tasks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{additionalMetrics.projectsInProgress}</div>
                  <p className="text-xs text-muted-foreground">
                    Projects in progress
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Work Management</h2>
                </div>
                <Button onClick={() => {
                  setEditingTask(null);
                  setIsTaskDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Work Task
                </Button>
              </div>

              <TaskGrid
                tasks={tasks}
                userData={userData}
                isLoading={isLoading}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Dialog */}
      <TaskDialog
        isOpen={isTaskDialogOpen}
        onOpenChange={(open) => {
          setIsTaskDialogOpen(open);
          if (!open) {
            setEditingTask(null);
          }
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
      />
    </div>
  );
}