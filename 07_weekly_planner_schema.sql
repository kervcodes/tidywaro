-- 07_weekly_planner_schema.sql

-- Create weekly_plans table
CREATE TABLE IF NOT EXISTS weekly_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, start_date)
);

-- Create daily_outfits table
CREATE TABLE IF NOT EXISTS daily_outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
    occasion TEXT, -- 'Work', 'Casual', 'Date Night', etc.
    weather_summary TEXT, -- 'Sunny, 25°C'
    items JSONB DEFAULT '[]'::JSONB, -- Array of item IDs or objects
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, date)
);

-- Enable RLS
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_outfits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_plans
CREATE POLICY "Users can view their own weekly plans"
    ON weekly_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly plans"
    ON weekly_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly plans"
    ON weekly_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly plans"
    ON weekly_plans FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for daily_outfits
-- We check the parent plan's user_id
CREATE POLICY "Users can view their own daily outfits"
    ON daily_outfits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM weekly_plans
            WHERE weekly_plans.id = daily_outfits.plan_id
            AND weekly_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own daily outfits"
    ON daily_outfits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM weekly_plans
            WHERE weekly_plans.id = daily_outfits.plan_id
            AND weekly_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own daily outfits"
    ON daily_outfits FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM weekly_plans
            WHERE weekly_plans.id = daily_outfits.plan_id
            AND weekly_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own daily outfits"
    ON daily_outfits FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM weekly_plans
            WHERE weekly_plans.id = daily_outfits.plan_id
            AND weekly_plans.user_id = auth.uid()
        )
    );
