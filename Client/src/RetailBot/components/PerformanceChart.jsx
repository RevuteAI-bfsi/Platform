import React from 'react';
import './PerformanceChart.css';

import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer 
} from 'recharts';

function PerformanceChart({ scores }) {
  // Default scores in case none are provided
  const defaultScores = {
    product_knowledge: 0,
    communication: 0,
    customer_respect: 0,
    solution_approach: 0
  };
  
  // Use provided scores or defaults
  const actualScores = scores || defaultScores;
  
  // Format data for radar chart
  const data = [
    {
      category: 'Product Knowledge',
      score: actualScores.product_knowledge,
      fullMark: 100,
    },
    {
      category: 'Communication',
      score: actualScores.communication,
      fullMark: 100,
    },
    {
      category: 'Customer Respect',
      score: actualScores.customer_respect,
      fullMark: 100,
    },
    {
      category: 'Solution Approach',
      score: actualScores.solution_approach,
      fullMark: 100,
    },
  ];

  return (
    <div className="chart-wrapper" style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="category" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar
            name="Performance"
            dataKey="score"
            stroke="#0057b7"
            fill="#0057b7"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PerformanceChart;