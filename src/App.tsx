import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, Check, X, Plus, Trash2, CreditCard as Edit3, ChevronLeft, ChevronRight, List, Focus, Square } from 'lucide-react';

// Storage keys
const STORAGE_KEYS = {
  TASKS: 'pomodoro_tasks',
  CURRENT_TASK_INDEX: 'pomodoro_current_task_index',
  SETTINGS: 'pomodoro_settings',
  SESSION_DATA: 'pomodoro_session_data'
};

// Helper functions for localStorage
const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (key: string, defaultValue: any = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

interface Task {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  completed: boolean;
  sessions: number;
  weightage: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

function App() {
  // Initialize state from localStorage - no predefined tasks
  const [tasks, setTasks] = useState<Task[]>(() => 
    loadFromStorage(STORAGE_KEYS.TASKS, [])
  );

  const [currentTaskIndex, setCurrentTaskIndex] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CURRENT_TASK_INDEX, 0)
  );
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [breakType, setBreakType] = useState<'short' | 'long'>('short');
  const [completedSessions, setCompletedSessions] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SESSION_DATA, { completedSessions: 0 }).completedSessions
  );
  
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Settings
  const [shortBreakTime, setShortBreakTime] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SETTINGS, { shortBreakTime: 5 }).shortBreakTime
  );
  
  const [longBreakTime, setLongBreakTime] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SETTINGS, { longBreakTime: 15 }).longBreakTime
  );
  
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SETTINGS, { sessionsUntilLongBreak: 4 }).sessionsUntilLongBreak
  );

  // Form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDuration, setTaskDuration] = useState(25);
  const [taskWeightage, setTaskWeightage] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [taskTags, setTaskTags] = useState('');

  const currentTask = tasks[currentTaskIndex] || null;
  const nextTask = tasks[currentTaskIndex + 1] || null;

  // Enhanced notification sounds
  const playBreakStartSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Gentle descending chime for break start
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play break start sound:', error);
    }
  }, []);

  const playFocusStartSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Energetic ascending chime for focus start
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.warn('Could not play focus start sound:', error);
    }
  }, []);

  // Initialize timer when current task changes or when not active
  useEffect(() => {
    if (currentTask && !isBreak && timeLeft === 0) {
      setTimeLeft(currentTask.duration * 60);
    }
  }, [currentTask, isBreak, timeLeft]);

  // Update timer when current task duration changes
  useEffect(() => {
    if (currentTask && !isBreak && !isActive) {
      setTimeLeft(currentTask.duration * 60);
    }
  }, [currentTask?.duration, isBreak, isActive]);

  // Save to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_TASK_INDEX, currentTaskIndex);
  }, [currentTaskIndex]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SESSION_DATA, { completedSessions });
  }, [completedSessions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SETTINGS, {
      shortBreakTime,
      longBreakTime,
      sessionsUntilLongBreak
    });
  }, [shortBreakTime, longBreakTime, sessionsUntilLongBreak]);

  // Timer logic
  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      if (!isBreak && currentTask) {
        // Work session completed - start break
        const newCompletedSessions = completedSessions + 1;
        setCompletedSessions(newCompletedSessions);
        
        // Update task sessions
        setTasks(prev => prev.map(task => 
          task.id === currentTask.id 
            ? { ...task, sessions: task.sessions + 1 }
            : task
        ));

        // Start break
        const nextBreakType = newCompletedSessions % sessionsUntilLongBreak === 0 ? 'long' : 'short';
        setBreakType(nextBreakType);
        setIsBreak(true);
        setTimeLeft(nextBreakType === 'short' ? shortBreakTime * 60 : longBreakTime * 60);
        
        // Play break start sound and show notification
        playBreakStartSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus session complete!', {
            body: `Time for a ${nextBreakType} break`,
            icon: '/vite.svg'
          });
        }
      } else {
        // Break completed - return to focus
        setIsBreak(false);
        setIsActive(false);
        if (currentTask) {
          setTimeLeft(currentTask.duration * 60);
        }
        
        // Play focus start sound and show notification
        playFocusStartSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Break complete!', {
            body: 'Ready for your next focus session?',
            icon: '/vite.svg'
          });
        }
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, currentTask, completedSessions, shortBreakTime, longBreakTime, sessionsUntilLongBreak, breakType, playBreakStartSound, playFocusStartSound]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const totalTime = isBreak 
    ? (breakType === 'short' ? shortBreakTime * 60 : longBreakTime * 60)
    : (currentTask?.duration || 25) * 60;
  const progress = timeLeft > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const startTimer = () => {
    if (!currentTask && !isBreak) return;
    setIsActive(true);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (isBreak) {
      setTimeLeft(breakType === 'short' ? shortBreakTime * 60 : longBreakTime * 60);
    } else if (currentTask) {
      setTimeLeft(currentTask.duration * 60);
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setIsBreak(false);
    if (currentTask) {
      setTimeLeft(currentTask.duration * 60);
    }
  };

  const selectTask = (taskIndex: number) => {
    setCurrentTaskIndex(taskIndex);
    setIsActive(false);
    setIsBreak(false);
    setShowTaskList(false);
  };

  const nextTaskHandler = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      setIsActive(false);
      setIsBreak(false);
    }
  };

  const previousTaskHandler = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
      setIsActive(false);
      setIsBreak(false);
    }
  };

  const addTask = () => {
    if (!taskTitle.trim()) return;
    
    const tagsArray = taskTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      duration: taskDuration,
      completed: false,
      sessions: 0,
      weightage: taskWeightage,
      tags: tagsArray
    };

    setTasks(prev => [...prev, newTask]);
    
    // If this is the first task, set it as current
    if (tasks.length === 0) {
      setCurrentTaskIndex(0);
    }
    
    resetForm();
  };

  const updateTask = () => {
    if (!editingTask || !taskTitle.trim()) return;
    
    const tagsArray = taskTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    setTasks(prev => prev.map(task => 
      task.id === editingTask.id 
        ? { 
            ...task, 
            title: taskTitle.trim(),
            description: taskDescription.trim() || undefined,
            duration: taskDuration,
            weightage: taskWeightage,
            tags: tagsArray
          }
        : task
    ));
    
    resetForm();
  };

  const deleteTask = (taskId: string) => {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));
    
    if (taskIndex === currentTaskIndex && currentTaskIndex >= tasks.length - 1) {
      setCurrentTaskIndex(Math.max(0, tasks.length - 2));
    } else if (taskIndex < currentTaskIndex) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
    
    setIsActive(false);
    setIsBreak(false);
  };

  const openTaskForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDescription(task.description || '');
      setTaskDuration(task.duration);
      setTaskWeightage(task.weightage);
      setTaskTags(task.tags.join(', '));
    } else {
      resetForm();
    }
    setShowTaskForm(true);
  };

  const resetForm = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDuration(25);
    setTaskWeightage('medium');
    setTaskTags('');
    setShowTaskForm(false);
  };

  const getWeightageColor = (weightage: string) => {
    switch (weightage) {
      case 'low': return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-400/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
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

      {/* Top Controls */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex space-x-2 z-20">
        {tasks.length > 0 && (
          <button
            onClick={() => setShowTaskList(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-white/10 hover:text-white/80 flex items-center justify-center"
          >
            <List size={14} className="sm:w-4 sm:h-4" />
          </button>
        )}
        <button
          onClick={() => openTaskForm()}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-white/10 hover:text-white/80 flex items-center justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-white/10 hover:text-white/80 flex items-center justify-center"
        >
          <Settings size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center p-3 sm:p-4">
        <div className="text-center max-w-md mx-auto w-full">
          {/* Show focus session UI only if there are tasks */}
          {tasks.length > 0 ? (
            <>
              {/* Session Status */}
              <div className="mb-3 sm:mb-4">
                <div className={`inline-flex px-3 py-1.5 sm:px-4 sm:py-2 rounded-full backdrop-blur-xl border transition-all duration-500 text-xs sm:text-sm ${
                  isBreak 
                    ? 'bg-orange-500/20 border-orange-400/30 text-orange-300' 
                    : 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                }`}>
                  {isBreak ? `${breakType === 'short' ? 'Short' : 'Long'} Break` : 'Focus Session'}
                </div>
              </div>

              {/* Current Task Info */}
              {currentTask && !isBreak && (
                <div className="mb-4 sm:mb-6">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <button
                        onClick={previousTaskHandler}
                        disabled={currentTaskIndex === 0}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-white/20 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 hover:text-white/80 transition-all duration-200 flex items-center justify-center"
                      >
                        <ChevronLeft size={12} className="sm:w-3.5 sm:h-3.5" />
                      </button>
                      
                      <div className="flex-1 min-w-0 mx-2 sm:mx-3">
                        <h1 className="text-base sm:text-lg font-medium text-white/90 mb-1 truncate">
                          {currentTask.title}
                        </h1>
                        {currentTask.description && (
                          <p className="text-white/60 text-xs sm:text-sm line-clamp-2 mb-1">{currentTask.description}</p>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/60 mb-2">
                          <span>{currentTask.duration}min</span>
                          <span>•</span>
                          <span>{currentTask.sessions} sessions</span>
                          <span>•</span>
                          <span>{currentTaskIndex + 1}/{tasks.length}</span>
                        </div>
                        
                        {/* Weightage and Tags */}
                        <div className="flex flex-wrap items-center justify-center gap-1 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs border backdrop-blur-xl ${getWeightageColor(currentTask.weightage)}`}>
                            {currentTask.weightage}
                          </span>
                          {(currentTask.tags || []).map((tag, index) => (
                            <span key={index} className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-xl">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={nextTaskHandler}
                        disabled={currentTaskIndex === tasks.length - 1}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-white/20 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 hover:text-white/80 transition-all duration-200 flex items-center justify-center"
                      >
                        <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => openTaskForm(currentTask)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-white/20 text-white/60 hover:bg-white/20 hover:text-white/80 transition-all duration-200 flex items-center justify-center"
                      >
                        <Edit3 size={10} className="sm:w-3 sm:h-3" />
                      </button>
                      <button
                        onClick={() => deleteTask(currentTask.id)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/20 border border-red-400/40 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 flex items-center justify-center"
                      >
                        <Trash2 size={10} className="sm:w-3 sm:h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Break Message */}
              {isBreak && (
                <div className="mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-orange-500/20 border border-orange-400/30 flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                    <Focus size={20} className="sm:w-6 sm:h-6 text-orange-300" />
                  </div>
                  <h1 className="text-lg sm:text-xl font-medium text-white/90 mb-1 sm:mb-2">Take a break</h1>
                  <p className="text-white/60 text-sm sm:text-base">You've completed a focus session. Time to recharge!</p>
                </div>
              )}

              {/* Timer Display */}
              <div className="mb-6 sm:mb-8">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-light text-white/95 mb-4 sm:mb-6 tracking-wider font-mono">
                  {formatTime(timeLeft)}
                </div>
                
                {/* Progress Bar */}
                <div className="relative w-full max-w-xs mx-auto h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out ${
                      isBreak ? 'bg-orange-400 shadow-orange-400/50' : 'bg-blue-400 shadow-blue-400/50'
                    }`}
                    style={{ 
                      width: `${progress}%`,
                      boxShadow: `0 0 15px currentColor`
                    }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center space-x-3 sm:space-x-4 mb-4">
                {!isActive ? (
                  <button
                    onClick={startTimer}
                    disabled={!currentTask && !isBreak}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 backdrop-blur-xl shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play size={16} className="sm:w-5 sm:h-5 ml-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={toggleTimer}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 backdrop-blur-xl shadow-lg shadow-orange-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center"
                  >
                    <Pause size={16} className="sm:w-5 sm:h-5" />
                  </button>
                )}
                
                <button
                  onClick={resetTimer}
                  disabled={timeLeft === 0 && !isActive}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-white/10 hover:text-white/80 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={16} className="sm:w-5 sm:h-5" />
                </button>

                {isActive && (
                  <button
                    onClick={stopSession}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-red-500/30 flex items-center justify-center"
                  >
                    <Square size={16} className="sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>

              {/* Next Task Preview */}
              {nextTask && !isBreak && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/60 text-xs mb-1">Next</p>
                      <p className="text-white/90 font-medium text-sm truncate">{nextTask.title}</p>
                    </div>
                    <div className="text-white/60 text-xs ml-2">
                      {nextTask.duration}min
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No Tasks Message */
            <div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                <Plus size={20} className="sm:w-6 sm:h-6 text-white/40" />
              </div>
              <h2 className="text-lg sm:text-xl font-medium text-white/70 mb-2 sm:mb-3">No tasks yet</h2>
              <p className="text-white/50 mb-4 sm:mb-6 text-sm">Add your first task to get started</p>
              <button
                onClick={() => openTaskForm()}
                className="px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-blue-500/30 font-medium text-sm"
              >
                Add Task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task List Modal */}
      {showTaskList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 p-3 sm:p-4">
          <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg font-medium text-white/90">All Tasks</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openTaskForm()}
                  className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 transition-all duration-200 flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => setShowTaskList(false)}
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/60 hover:bg-white/20 hover:text-white/80 transition-all duration-200 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 ${
                    index === currentTaskIndex
                      ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm truncate flex-1">{task.title}</h3>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskForm(task);
                        }}
                        className="w-6 h-6 rounded-full bg-white/10 border border-white/20 text-white/60 hover:bg-white/20 hover:text-white/80 transition-all duration-200 flex items-center justify-center"
                      >
                        <Edit3 size={10} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        className="w-6 h-6 rounded-full bg-red-500/20 border border-red-400/40 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 flex items-center justify-center"
                      >
                        <Trash2 size={10} />
                      </button>
                      <span className="text-xs opacity-70 ml-1">{task.duration}min</span>
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-xs opacity-70 line-clamp-2 mb-1">{task.description}</p>
                  )}
                  
                  {/* Weightage and Tags in Task List */}
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs border backdrop-blur-xl ${getWeightageColor(task.weightage)}`}>
                      {task.weightage}
                    </span>
                    {(task.tags || []).slice(0, 2).map((tag, tagIndex) => (
                      <span key={tagIndex} className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-xl">
                        {tag}
                      </span>
                    ))}
                    {(task.tags || []).length > 2 && (
                      <span className="text-xs opacity-60">+{(task.tags || []).length - 2}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs opacity-60">
                    <span>{task.sessions} sessions</span>
                    <button
                      onClick={() => selectTask(index)}
                      className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all duration-200"
                    >
                      {index === currentTaskIndex ? 'Current' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 p-3 sm:p-4">
          <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-medium text-white/90 mb-4 sm:mb-6 text-center">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 sm:mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white/90 backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 sm:mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white/90 backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 sm:mb-2">
                  Duration (minutes)
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setTaskDuration(Math.max(5, taskDuration - 5))}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200 text-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(Math.max(5, Math.min(120, parseInt(e.target.value) || 5)))}
                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white/90 text-center backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 text-sm"
                    min="5"
                    max="120"
                  />
                  <button
                    onClick={() => setTaskDuration(Math.min(120, taskDuration + 5))}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 sm:mb-2">
                  Priority Level
                </label>
                <select
                  value={taskWeightage}
                  onChange={(e) => setTaskWeightage(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white/90 backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 text-sm"
                >
                  <option value="low" className="bg-gray-800 text-white">Low Priority</option>
                  <option value="medium" className="bg-gray-800 text-white">Medium Priority</option>
                  <option value="high" className="bg-gray-800 text-white">High Priority</option>
                  <option value="critical" className="bg-gray-800 text-white">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 sm:mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={taskTags}
                  onChange={(e) => setTaskTags(e.target.value)}
                  placeholder="work, urgent, meeting..."
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white/90 backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-center space-x-3 mt-4 sm:mt-6">
              <button
                onClick={resetForm}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:bg-white/10 hover:text-white/80 flex items-center justify-center"
              >
                <X size={16} />
              </button>
              <button
                onClick={editingTask ? updateTask : addTask}
                disabled={!taskTitle.trim()}
                className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 backdrop-blur-xl shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 p-3 sm:p-4">
          <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-medium text-white/90 mb-4 sm:mb-6 text-center">Settings</h2>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 sm:mb-2">
                  Short Break (minutes)
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShortBreakTime(Math.max(1, shortBreakTime - 1))}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200 text-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={shortBreakTime}
                    onChange={(e) => setShortBreakTime(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white/90 text-center backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 text-sm"
                    min="1"
                    max="30"
                  />
                  <button
                    onClick={() => setShortBreakTime(Math.min(30, shortBreakTime + 1))}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 sm:mb-2">
                  Long Break (minutes)
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setLongBreakTime(Math.max(5, longBreakTime - 5))}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200 text-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={longBreakTime}
                    onChange={(e) => setLongBreakTime(Math.max(5, Math.min(60, parseInt(e.target.value) || 5)))}
                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white/90 text-center backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 text-sm"
                    min="5"
                    max="60"
                  />
                  <button
                    onClick={() => setLongBreakTime(Math.min(60, longBreakTime + 5))}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 sm:mb-2">
                  Sessions until long break
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSessionsUntilLongBreak(Math.max(2, sessionsUntilLongBreak - 1))}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200 text-lg"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={sessionsUntilLongBreak}
                    onChange={(e) => setSessionsUntilLongBreak(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white/90 text-center backdrop-blur-xl focus:outline-none focus:border-white/40 transition-all duration-200 text-sm"
                    min="2"
                    max="10"
                  />
                  <button
                    onClick={() => setSessionsUntilLongBreak(Math.min(10, sessionsUntilLongBreak + 1))}
                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/20 transition-all duration-200 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-4 sm:mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 backdrop-blur-xl shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <Check size={16} />
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
        {[...Array(20)].map((_, i) => (
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
        <div className={`absolute inset-0 transition-all duration-[4000ms]`}
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