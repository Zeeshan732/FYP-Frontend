import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum TaskPriority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}

export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Blocked = 'blocked',
  Cancelled = 'cancelled'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies?: string[];
  estimatedHours?: number;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  category?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskManagerService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();

  private priorityOrder: { [key in TaskPriority]: number } = {
    [TaskPriority.Critical]: 1,
    [TaskPriority.High]: 2,
    [TaskPriority.Medium]: 3,
    [TaskPriority.Low]: 4
  };

  private statusOrder: { [key in TaskStatus]: number } = {
    [TaskStatus.InProgress]: 1,
    [TaskStatus.Pending]: 2,
    [TaskStatus.Blocked]: 3,
    [TaskStatus.Completed]: 4,
    [TaskStatus.Cancelled]: 5
  };

  constructor() {
    this.initializeTasks();
  }

  private initializeTasks(): void {
    const initialTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Performance Metrics Dashboard',
        description: 'Display metrics from API with charts for accuracy, precision, recall, F1 scores',
        priority: TaskPriority.Critical,
        status: TaskStatus.Completed,
        estimatedHours: 8,
        category: 'Dashboard',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date()
      },
      {
        id: 'task-2',
        title: 'Cross-Validation Results Display',
        description: 'Show validation results across datasets with fold-by-fold visualization',
        priority: TaskPriority.Critical,
        status: TaskStatus.Completed,
        dependencies: ['task-1'],
        estimatedHours: 6,
        category: 'Dashboard',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date()
      },
      {
        id: 'task-3',
        title: 'Technology Page Content',
        description: 'CMDAN architecture explanation, model diagrams, technical specifications',
        priority: TaskPriority.Critical,
        status: TaskStatus.Completed,
        estimatedHours: 4,
        category: 'Content',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date()
      },
      {
        id: 'task-4',
        title: 'Real API Integration for Demo',
        description: 'Connect technology demo to actual API endpoints (analysis/submit, file upload)',
        priority: TaskPriority.Critical,
        status: TaskStatus.Pending,
        dependencies: ['task-3'],
        estimatedHours: 6,
        category: 'Integration',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task-5',
        title: 'Clinical Use Page',
        description: 'Implementation guidelines, case studies, regulatory information',
        priority: TaskPriority.High,
        status: TaskStatus.Pending,
        estimatedHours: 4,
        category: 'Content',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task-6',
        title: 'Collaboration Page',
        description: 'Partnership form with API integration for collaboration requests',
        priority: TaskPriority.High,
        status: TaskStatus.Pending,
        estimatedHours: 3,
        category: 'Form',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task-7',
        title: 'Dataset Information Display',
        description: 'Show datasets with statistics, metadata, public vs private indicators',
        priority: TaskPriority.High,
        status: TaskStatus.Pending,
        estimatedHours: 4,
        category: 'Display',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task-8',
        title: 'Voice Analysis Module',
        description: 'Full implementation with API integration for voice analysis',
        priority: TaskPriority.High,
        status: TaskStatus.Pending,
        dependencies: ['task-4'],
        estimatedHours: 8,
        category: 'Module',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task-9',
        title: 'Gait Analysis Module',
        description: 'Full implementation with API integration for gait analysis',
        priority: TaskPriority.High,
        status: TaskStatus.Pending,
        dependencies: ['task-4'],
        estimatedHours: 8,
        category: 'Module',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task-10',
        title: 'NeuroSync Progression Timeline',
        description: 'Interactive timeline visualizer for disease progression stages',
        priority: TaskPriority.Medium,
        status: TaskStatus.Pending,
        estimatedHours: 6,
        category: 'Educational',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task-11',
        title: 'Domain Adaptation Explainer',
        description: 'Educational content about domain adaptation and CMDAN approach',
        priority: TaskPriority.Medium,
        status: TaskStatus.Pending,
        dependencies: ['task-3'],
        estimatedHours: 4,
        category: 'Educational',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task-12',
        title: 'D3.js Visualizations',
        description: 'Advanced charts integration for custom visualizations',
        priority: TaskPriority.Low,
        status: TaskStatus.Pending,
        dependencies: ['task-1', 'task-2'],
        estimatedHours: 8,
        category: 'Enhancement',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.tasksSubject.next(initialTasks);
  }

  getAllTasks(): Task[] {
    return this.getSortedTasks(this.tasksSubject.value);
  }

  getTasksByPriority(priority: TaskPriority): Task[] {
    return this.tasksSubject.value.filter(task => task.priority === priority);
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasksSubject.value.filter(task => task.status === status);
  }

  getNextAvailableTask(): Task | null {
    const tasks = this.getAllTasks();
    
    for (const task of tasks) {
      if (task.status === TaskStatus.Pending) {
        if (this.areDependenciesMet(task)) {
          return task;
        }
      }
    }
    
    return null;
  }

  getExecutionOrder(): Task[] {
    const tasks = this.getAllTasks();
    const executionOrder: Task[] = [];
    const completed = new Set<string>();
    const inProgress = new Set<string>();

    tasks.filter(t => t.status === TaskStatus.InProgress).forEach(task => {
      executionOrder.push(task);
      inProgress.add(task.id);
    });

    const pendingTasks = tasks.filter(t => t.status === TaskStatus.Pending);
    
    while (pendingTasks.length > 0) {
      let found = false;
      
      for (let i = 0; i < pendingTasks.length; i++) {
        const task = pendingTasks[i];
        
        if (this.areDependenciesMet(task, completed, inProgress)) {
          executionOrder.push(task);
          completed.add(task.id);
          pendingTasks.splice(i, 1);
          found = true;
          break;
        }
      }
      
      if (!found) {
        pendingTasks.forEach(task => {
          if (!completed.has(task.id)) {
            executionOrder.push(task);
            completed.add(task.id);
          }
        });
        break;
      }
    }

    return executionOrder;
  }

  private areDependenciesMet(
    task: Task, 
    completed: Set<string> = new Set(), 
    inProgress: Set<string> = new Set()
  ): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    const tasks = this.tasksSubject.value;
    const completedSet = completed.size > 0 ? completed : new Set(
      tasks.filter(t => t.status === TaskStatus.Completed).map(t => t.id)
    );

    return task.dependencies.every(depId => {
      const depTask = tasks.find(t => t.id === depId);
      if (!depTask) return false;
      
      return depTask.status === TaskStatus.Completed || 
             completedSet.has(depId) ||
             inProgress.has(depId);
    });
  }

  private getSortedTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const statusDiff = this.statusOrder[a.status] - this.statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      const priorityDiff = this.priorityOrder[a.priority] - this.priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    const tasks = this.tasksSubject.value;
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        status,
        updatedAt: new Date(),
        completedAt: status === TaskStatus.Completed ? new Date() : undefined
      };
      
      this.tasksSubject.next([...tasks]);
    }
  }

  getTaskStatistics(): {
    total: number;
    byPriority: { [key in TaskPriority]: number };
    byStatus: { [key in TaskStatus]: number };
    completed: number;
    inProgress: number;
    pending: number;
    progressPercentage: number;
  } {
    const tasks = this.tasksSubject.value;
    
    const byPriority: { [key in TaskPriority]: number } = {
      [TaskPriority.Critical]: 0,
      [TaskPriority.High]: 0,
      [TaskPriority.Medium]: 0,
      [TaskPriority.Low]: 0
    };

    const byStatus: { [key in TaskStatus]: number } = {
      [TaskStatus.Pending]: 0,
      [TaskStatus.InProgress]: 0,
      [TaskStatus.Completed]: 0,
      [TaskStatus.Blocked]: 0,
      [TaskStatus.Cancelled]: 0
    };

    tasks.forEach(task => {
      byPriority[task.priority]++;
      byStatus[task.status]++;
    });

    const completed = byStatus[TaskStatus.Completed];
    const total = tasks.length;
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      byPriority,
      byStatus,
      completed,
      inProgress: byStatus[TaskStatus.InProgress],
      pending: byStatus[TaskStatus.Pending],
      progressPercentage
    };
  }

  getReadyToStartTasks(): Task[] {
    const tasks = this.tasksSubject.value;
    return tasks.filter(task => {
      return task.status === TaskStatus.Pending && this.areDependenciesMet(task);
    });
  }

  startNextTask(): Task | null {
    const nextTask = this.getNextAvailableTask();
    if (nextTask) {
      this.updateTaskStatus(nextTask.id, TaskStatus.InProgress);
      return nextTask;
    }
    return null;
  }
}

