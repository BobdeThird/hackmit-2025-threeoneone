import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-code";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Custom MCP server for database operations
const databaseServer = createSdkMcpServer({
  name: "supabase-analytics",
  version: "1.0.0",
  tools: [
    tool(
      "query_reports",
      "Query the report_ranked table for 311 municipal data analysis",
      {
        select: z.string().default("*").describe("Columns to select"),
        where: z.array(z.object({
          column: z.string(),
          op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'in']),
          value: z.any()
        })).optional().describe("WHERE conditions"),
        orderBy: z.object({
          column: z.string(),
          ascending: z.boolean().optional().default(true)
        }).optional().describe("ORDER BY clause"),
        limit: z.number().int().min(1).max(1000).default(100).describe("LIMIT clause")
      },
      async (args) => {
        try {
          let query = supabaseAdmin.from('report_ranked').select(args.select);
          
          // Apply WHERE conditions
          if (args.where) {
            for (const condition of args.where) {
              if (condition.op === 'in' && Array.isArray(condition.value)) {
                query = query.in(condition.column, condition.value);
              } else if (condition.op === 'ilike') {
                query = query.ilike(condition.column, condition.value);
              } else {
                // Type-safe approach for other operators
                switch (condition.op) {
                  case 'eq':
                    query = query.eq(condition.column, condition.value);
                    break;
                  case 'neq':
                    query = query.neq(condition.column, condition.value);
                    break;
                  case 'gt':
                    query = query.gt(condition.column, condition.value);
                    break;
                  case 'gte':
                    query = query.gte(condition.column, condition.value);
                    break;
                  case 'lt':
                    query = query.lt(condition.column, condition.value);
                    break;
                  case 'lte':
                    query = query.lte(condition.column, condition.value);
                    break;
                }
              }
            }
          }
          
          // Apply ORDER BY
          if (args.orderBy) {
            query = query.order(args.orderBy.column, { ascending: args.orderBy.ascending });
          }
          
          // Apply LIMIT
          query = query.limit(args.limit);
          
          const { data, error } = await query;
          
          if (error) {
            return {
              content: [{
                type: "text",
                text: `Database error: ${error.message}`
              }]
            };
          }
          
          return {
            content: [{
              type: "text", 
              text: `Query returned ${data?.length || 0} rows:\n\n${JSON.stringify(data, null, 2)}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    ),

    tool(
      "analyze_trends",
      "Analyze temporal trends in 311 data",
      {
        city: z.enum(["SF", "NYC", "BOSTON"]).optional().describe("Filter by city"),
        department: z.string().optional().describe("Filter by department"),
        timeframe: z.enum(["7d", "30d", "90d", "1y"]).default("30d").describe("Time window for analysis"),
        metric: z.enum(["count", "avg_ranking", "resolution_time"]).default("count").describe("Metric to analyze")
      },
      async (args) => {
        try {
          const timeframes = {
            "7d": 7,
            "30d": 30, 
            "90d": 90,
            "1y": 365
          };
          
          const daysBack = timeframes[args.timeframe];
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - daysBack);
          
          let query = supabaseAdmin
            .from('report_ranked')
            .select('reported_time, ranking, department, status, estimated_time')
            .gte('reported_time', startDate.toISOString());
            
          if (args.city) {
            query = query.eq('city', args.city);
          }
          
          if (args.department) {
            query = query.eq('department', args.department);
          }
          
          const { data, error } = await query.order('reported_time', { ascending: true });
          
          if (error) {
            return {
              content: [{
                type: "text",
                text: `Trend analysis error: ${error.message}`
              }]
            };
          }
          
          // Group by day and calculate metrics
          const dailyStats = data?.reduce((acc: Record<string, any>, row) => {
            const date = new Date(row.reported_time).toISOString().split('T')[0];
            if (!acc[date]) {
              acc[date] = { count: 0, rankings: [], times: [] };
            }
            acc[date].count++;
            acc[date].rankings.push(row.ranking);
            if (row.estimated_time) acc[date].times.push(row.estimated_time);
            return acc;
          }, {});
          
          const analysis = Object.entries(dailyStats || {}).map(([date, stats]: [string, any]) => ({
            date,
            count: stats.count,
            avg_ranking: stats.rankings.reduce((a: number, b: number) => a + b, 0) / stats.rankings.length,
            avg_resolution_time: stats.times.length > 0 
              ? stats.times.reduce((a: number, b: number) => a + b, 0) / stats.times.length 
              : null
          }));
          
          return {
            content: [{
              type: "text",
              text: `Trend Analysis (${args.timeframe}):\n\n${JSON.stringify(analysis, null, 2)}\n\nTotal records: ${data?.length || 0}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Trend analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    ),

    tool(
      "get_schema_info",
      "Get database schema information for the report_ranked table",
      {},
      async () => {
        const schema = {
          table: "report_ranked",
          columns: {
            id: "uuid (primary key)",
            street_address: "text",
            latitude: "double precision",
            longitude: "double precision", 
            images: "text[] (array)",
            reported_time: "timestamptz",
            description: "text",
            native_id: "text",
            status: "text",
            source_scraper: "text",
            ranking: "integer",
            summary: "text",
            estimated_time: "integer (hours)",
            department: "enum (Public Safety, Public Works & Transportation, etc.)",
            city: "enum (NYC, BOSTON, SF)",
            upvotes: "integer",
            downvotes: "integer",
            created_at: "timestamptz",
            updated_at: "timestamptz"
          },
          departments: [
            "Public Safety",
            "Public Works & Transportation", 
            "Sanitation & Environment",
            "Utilities (Water/Power)",
            "Housing, Buildings & Code",
            "Parks & Recreation",
            "Health & Human Services",
            "Animal Services"
          ]
        };
        
        return {
          content: [{
            type: "text",
            text: `Database Schema:\n\n${JSON.stringify(schema, null, 2)}`
          }]
        };
      }
    )
  ]
});

// Policy analysis function using Claude Code
export async function runPolicyAnalysis(
  prompt: string,
  onMessage?: (message: any) => void
): Promise<AsyncGenerator<any, void, unknown>> {
  
  const fullPrompt = `You are a senior policy analyst specializing in municipal 311 data analysis. 

Your task: ${prompt}

Available tools:
1. query_reports - Query the report_ranked table with SQL-like filters
2. analyze_trends - Analyze temporal patterns in the data  
3. get_schema_info - Get database schema information

Instructions:
1. Start by understanding the database schema
2. Query relevant data to understand the current situation
3. Analyze trends and patterns
4. Generate actionable policy insights with specific recommendations
5. Present findings in clear, executive-ready format with data to back up claims

Please begin your analysis now.`;

  return query({
    prompt: fullPrompt,
    options: {
      mcpServers: {
        "supabase-analytics": databaseServer
      },
      allowedTools: [
        "mcp__supabase-analytics__query_reports",
        "mcp__supabase-analytics__analyze_trends", 
        "mcp__supabase-analytics__get_schema_info"
      ],
      maxTurns: 10,
      model: "claude-3-5-sonnet-20241022"
    }
  });
}
