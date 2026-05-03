"use client";

import { Card } from "@/components/ui/card";

interface SolvedProgressProps {
  solvedProblem: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
}

export function SolvedProgress({
  solvedProblem,
  easySolved,
  mediumSolved,
  hardSolved,
  totalEasy,
  totalMedium,
  totalHard,
}: SolvedProgressProps) {
  return (
    <Card className="p-4">
      <div className="text-center mb-4">
        <p className="text-4xl font-bold">{solvedProblem}</p>
        <p className="text-sm text-muted-foreground">Solved</p>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-green-400">Easy</span>
            <span className="text-muted-foreground">{easySolved} / {totalEasy}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(easySolved / totalEasy) * 100}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-yellow-400">Medium</span>
            <span className="text-muted-foreground">{mediumSolved} / {totalMedium}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 rounded-full"
              style={{ width: `${(mediumSolved / totalMedium) * 100}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-red-400">Hard</span>
            <span className="text-muted-foreground">{hardSolved} / {totalHard}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${(hardSolved / totalHard) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}