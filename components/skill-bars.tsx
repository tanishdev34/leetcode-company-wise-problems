"use client";

import { Card } from "@/components/ui/card";

interface SkillBarsProps {
  fundamental: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
  intermediate: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
  advanced: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
}

function SkillColumn({
  title,
  skills,
  colorClass,
}: {
  title: string;
  skills: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
  colorClass: string;
}) {
  const max = skills[0]?.problemsSolved || 1;
  
  return (
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium mb-2 text-center">{title}</h4>
      <div className="space-y-2">
        {skills.slice(0, 8).map((skill) => (
          <div key={skill.tagSlug}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="truncate">{skill.tagName}</span>
              <span className="text-muted-foreground">{skill.problemsSolved}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${colorClass}`}
                style={{ width: `${(skill.problemsSolved / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkillBars({ fundamental, intermediate, advanced }: SkillBarsProps) {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Skills</h3>
      <div className="flex gap-4 flex-col sm:flex-row">
        <SkillColumn title="Fundamental" skills={fundamental} colorClass="bg-blue-500" />
        <SkillColumn title="Intermediate" skills={intermediate} colorClass="bg-purple-500" />
        <SkillColumn title="Advanced" skills={advanced} colorClass="bg-orange-500" />
      </div>
    </Card>
  );
}