import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, Check, X, Plus, Trash2, CreditCard as Edit3 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  completed: boolean;
  sessions: number;
}

const DEFAULT_WORK_TIME = 25;
const DEFAULT_SHORT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;

function App() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Review project proposal',
      description: 'Go through the Q4 marketing strategy document',
      duration: 25,
      completed: false,
      sessions: 0
    },
    {
      id: '2',
      title: 'Design system updates',
      description: 'Update component library with new color tokens',
      duration: 45,
      completed: false,
      sessions: 0
    }
  ]);

  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [breakType, setBreakType] = useState<'short' | 'long'>('short');
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Settings
  const [shortBreakTime, setShortBreakTime] = useState(DEFAULT_SHORT_BREAK);
  const [longBreakTime, setLongBreakTime] = useState(DEFAULT_LONG_BREAK);
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(4);

  // Form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDuration, setTaskDuration] = useState(25);

  const totalTime = isBreak 
    ? (breakType === 'short' ? shortBreakTime * 60 : longBreakTime * 60)
    : (currentTask?.duration || 25) * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentTask) {
      if (!isBreak) {
        // Work session completed
        const newCompletedSessions = completedSessions + 1;
        setCompletedSessions(newCompletedSessions);
        
        // Update task sessions
        setTasks(prev => prev.map(task => 
          task.id === currentTask.id 
            ? { ...task, sessions: task.sessions + 1 }
            : task
        ));

        // Determine break type
        const nextBreakType = newCompletedSessions % sessionsUntilLongBreak === 0 ? 'long' : 'short';
        setBreakType(nextBreakType);
        setIsBreak(true);
        setTimeLeft(nextBreakType === 'short' ? shortBreakTime * 60 : longBreakTime * 60);
        
        // Send notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus session complete!', {
            body: `Time for a ${nextBreakType} break`,
            icon: '/vite.svg'
          });
        }
      } else {
        // Break completed
        setIsBreak(false);
        setCurrentTask(null);
        
        // Send notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Break complete!', {
            body: 'Ready for your next focus session?',
            icon: '/vite.svg'
          });
        }
      }
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, currentTask, completedSessions, shortBreakTime, longBreakTime, sessionsUntilLongBreak, breakType]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const startTask = (task: Task) => {
    setCurrentTask(task);
    setTimeLeft(task.duration * 60);
    setIsBreak(false);
    setIsActive(true);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = useCallback(() => {
    setIsActive(false);
    if (isBreak) {
      setTimeLeft(breakType === 'short' ? shortBreakTime * 60 : longBreakTime * 60);
    } else if (currentTask) {
      setTimeLeft(currentTask.duration * 60);
    }
  }, [isBreak, breakType, shortBreakTime, longBreakTime, currentTask]);

  const stopSession = () => {
    setIsActive(false);
    setCurrentTask(null);
    setIsBreak(false);
    setTimeLeft(0);
  };

  const addTask = () => {
    if (!taskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      duration: taskDuration,
      completed: false,
      sessions: 0
    };

    setTasks(prev => [...prev, newTask]);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDuration(25);
    setShowTaskForm(false);
  };

  const updateTask = () => {
    if (!editingTask || !taskTitle.trim()) return;
    
    setTasks(prev => prev.map(task => 
      task.id === editingTask.id 
        ? { 
            ...task, 
            title: taskTitle.trim(),
            description: taskDescription.trim() || undefined,
            duration: taskDuration
          }
        : task
    ));
    
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDuration(25);
    setShowTaskForm(false);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    if (currentTask?.id === taskId) {
      stopSession();
    }
  };

  const openTaskForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDescription(task.description || '');
      setTaskDuration(task.duration);
    } else {
      setEditingTask(null);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDuration(25);
    }
    setShowTaskForm(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Ambient Background Animation */}
      <AmbientBackground 
        isBreak={isBreak} 
        progress={progress} 
        isActive={isActive}
        breakType={breakType}
      />

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-white/10 hover:text-white/80 flex items-center justify-center z-20"
      >
        <Settings size={18} />
      </button>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Task Sidebar */}
        <div className="w-80 p-6 border-r border-white/10 backdrop-blur-xl bg-white/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-light text-white/90">Tasks</h2>
            <button
              onClick={() => openTaskForm()}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white/90 transition-all duration-200 flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
                  currentTask?.id === task.id
                    ? 'bg-blue-500/20 border-blue-400/40 shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white/90 font-medium truncate">{task.title}</h3>
                    {task.description && (
                      <p className="text-white/60 text-sm mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    <button
                      onClick={() => openTaskForm(task)}
                      className="w-8 h-8 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80 transition-all duration-200 flex items-center justify-center"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 flex items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span>{task.duration}min</span>
                    <span>{task.sessions} sessions</span>
                  </div>
                  
                  {currentTask?.id !== task.id && (
                    <button
                      onClick={() => startTask(task)}
                      className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white/90 transition-all duration-200 text-sm font-medium"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timer Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          {currentTask ? (
            <div className="text-center max-w-lg">
              {/* Current Task Info */}
              <div className="mb-12">
                <div className={`inline-flex px-6 py-3 rounded-full backdrop-blur-xl border transition-all duration-500 mb-4 ${
                  isBreak 
                    ? 'bg-orange-500/20 border-orange-400/30 text-orange-300' 
                    : 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                }`}>
                  {isBreak ? `${breakType === 'short' ? 'Short' : 'Long'} Break` : 'Focus Session'}
                </div>
                
                <h1 className="text-2xl font-light text-white/90 mb-2">
                  {isBreak ? 'Take a break' : currentTask.title}
                </h1>
                
                {!isBreak && currentTask.description && (
                  <p className="text-white/60 text-lg">{currentTask.description}</p>
                )}
              </div>

              {/* Timer Display */}
              <div className="mb-12">
                <div className="text-8xl font-light text-white/95 mb-8 tracking-wider font-mono">
                  {formatTime(timeLeft)}
                </div>
                
                {/* Progress Glow */}
                <div className="relative w-96 h-1 mx-auto bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out ${
                      isBreak ? 'bg-orange-400 shadow-orange-400/50' : 'bg-blue-400 shadow-blue-400/50'
                    }`}
                    style={{ 
                      width: `${progress}%`,
                      boxShadow: `0 0 20px currentColor`
                    }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center space-x-8">
                <button
                  onClick={toggleTimer}
                  className={`w-16 h-16 rounded-full backdrop-blur-xl border transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center ${
                    isActive 
                      ? 'bg-orange-500/20 border-orange-400/40 text-orange-300 shadow-lg shadow-orange-500/20' 
                      : 'bg-white/10 border-white/20 text-white/80 shadow-lg shadow-white/10'
                  }`}
                >
                  {isActive ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>
                
                <button
                  onClick={resetTimer}
                  className="w-16 h-16 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-white/10 hover:text-white/80 flex items-center justify-center"
                >
                  <RotateCcw size={20} />
                </button>

                <button
                  onClick={stopSession}
                  className="px-6 py-3 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-red-500/30 text-sm font-medium"
                >
                  Stop
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 mx-auto">
                <Play size={32} className="text-white/40 ml-1" />
              </div>
              <h2 className="text-2xl font-light text-white/70 mb-4">Ready to focus?</h2>
              <p className="text-white/50">Select a task from the sidebar to begin your session</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 p-6">
          <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-light text-white/90 mb-8 text-center">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white/90 backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Description (optional)
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white/90 backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Duration (minutes)
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setTaskDuration(Math.max(5, taskDuration - 5))}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(Math.max(5, Math.min(120, parseInt(e.target.value) || 5)))}
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white/90 text-center backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200"
                    min="5"
                    max="120"
                  />
                  <button
                    onClick={() => setTaskDuration(Math.min(120, taskDuration + 5))}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4 mt-8">
              <button
                onClick={() => setShowTaskForm(false)}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-white/10 hover:text-white/80 flex items-center justify-center"
              >
                <X size={18} />
              </button>
              <button
                onClick={editingTask ? updateTask : addTask}
                disabled={!taskTitle.trim()}
                className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 backdrop-blur-xl shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Check size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 p-6">
          <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-light text-white/90 mb-8 text-center">Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Short Break (minutes)
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShortBreakTime(Math.max(1, shortBreakTime - 1))}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={shortBreakTime}
                    onChange={(e) => setShortBreakTime(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white/90 text-center backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200"
                    min="1"
                    max="30"
                  />
                  <button
                    onClick={() => setShortBreakTime(Math.min(30, shortBreakTime + 1))}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Long Break (minutes)
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setLongBreakTime(Math.max(5, longBreakTime - 5))}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={longBreakTime}
                    onChange={(e) => setLongBreakTime(Math.max(5, Math.min(60, parseInt(e.target.value) || 5)))}
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white/90 text-center backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200"
                    min="5"
                    max="60"
                  />
                  <button
                    onClick={() => setLongBreakTime(Math.min(60, longBreakTime + 5))}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Sessions until long break
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSessionsUntilLongBreak(Math.max(2, sessionsUntilLongBreak - 1))}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={sessionsUntilLongBreak}
                    onChange={(e) => setSessionsUntilLongBreak(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white/90 text-center backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200"
                    min="2"
                    max="10"
                  />
                  <button
                    onClick={() => setSessionsUntilLongBreak(Math.min(10, sessionsUntilLongBreak + 1))}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={() => setShowSettings(false)}
                className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 backdrop-blur-xl shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <Check size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ambient Background Component
function AmbientBackground({ 
  isBreak, 
  progress, 
  isActive,
  breakType 
}: { 
  isBreak: boolean; 
  progress: number; 
  isActive: boolean;
  breakType: 'short' | 'long';
}) {
  return (
    <div className="absolute inset-0">
      {/* Base gradient */}
      <div className={`absolute inset-0 transition-all duration-[3000ms] ease-out ${
        isBreak 
          ? breakType === 'long'
            ? 'bg-gradient-to-br from-orange-900/20 via-red-900/10 to-black'
            : 'bg-gradient-to-br from-orange-900/15 via-amber-900/10 to-black'
          : 'bg-gradient-to-br from-blue-900/20 via-indigo-900/10 to-black'
      }`} />

      {/* Flowing gradients */}
      <div className={`absolute inset-0 transition-all duration-[5000ms] ease-out ${
        isBreak 
          ? 'bg-gradient-to-tr from-transparent via-orange-500/5 to-transparent'
          : 'bg-gradient-to-tr from-transparent via-blue-500/5 to-transparent'
      }`} 
      style={{
        transform: `translateX(${progress * 2 - 100}px) translateY(${Math.sin(progress / 10) * 20}px)`,
        opacity: isActive ? 0.8 : 0.3
      }} />

      {/* Starfield effect */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full transition-all duration-[2000ms] ${
              isBreak ? 'bg-orange-400/30' : 'bg-blue-400/30'
            }`}
            style={{
              left: `${(i * 7.3) % 100}%`,
              top: `${(i * 11.7) % 100}%`,
              animationDelay: `${i * 0.1}s`,
              opacity: isActive ? 0.6 : 0.2,
              transform: `scale(${0.5 + (progress / 200)})`,
            }}
          />
        ))}
      </div>

      {/* Breathing glow */}
      {isActive && (
        <div className={`absolute inset-0 transition-all duration-[4000ms] ${
          isBreak 
            ? 'bg-radial-gradient from-orange-500/10 via-transparent to-transparent'
            : 'bg-radial-gradient from-blue-500/10 via-transparent to-transparent'
        }`}
        style={{
          background: `radial-gradient(circle at 50% 50%, ${
            isBreak ? 'rgba(249, 115, 22, 0.1)' : 'rgba(59, 130, 246, 0.1)'
          } 0%, transparent 70%)`,
          transform: `scale(${1 + Math.sin(Date.now() / 3000) * 0.1})`,
        }} />
      )}
    </div>
  );
}

export default App;