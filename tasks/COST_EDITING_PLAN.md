# Dynamic Cost Editing Implementation Plan

## 1. Cost Editing Functionality
- **Feature Overview**: Administrators can modify the cost price of individual items in a quotation's Cost Analysis tab. 
- **UI Mockup**: 
  - Each row in the Cost Analysis table will feature an inline edit mode or an editable `<Input>` field for the `Cost (EGP)` column.
  - Edited rows will display a visual highlight (e.g., an amber border or "Modified" badge).
  - An "Undo" (🔄) button will appear next to modified costs to revert them to the baseline catalog price.
- **Validation**: `<Input>` fields will accept only positive numeric values, rejecting invalid keystrokes and ensuring data integrity.

## 2. Data Population & Binding Requirements
- **Local State Calculation**: Editing a cost will instantly update a local `editedCosts` state map.
- **Real-Time Recalculation**: The Total Cost, Total Profit, and Overall Margin KPI cards in the Cost Analysis tab will automatically react to `editedCosts`.
- **Database Architecture**: 
  - A `cost_price` column is being added to the `devices` table.
  - When the user clicks **"Save Cost Adjustments"**, the system updates the `cost_price` for those specific device records in the active quotation.

## 3. User Interface Considerations
- **Non-Editable vs. Editable**: Base `Revenue (EGP)` is fixed based on quotation setup. `Cost (EGP)` will be clearly marked as an editable input.
- **Original vs. Modified Display**: A tooltip or small subtext will show the original catalog cost if a modification is active.
- **Confirmation Prompts**: If an entered cost drops the margin below 0%, a warning highlight/tooltip will appear.
- **Reset Option**: Users can easily reset a custom cost to the catalog default.

## 4. Technical Implementation & Data Flow
- **Data Flow Diagram**:
  1. `CostAnalysisTab` loads `devices` (from quotation) and `device_prices` (baseline catalog).
  2. The system checks `device.cost_price`. If present, it represents a custom edited cost. Otherwise, it falls back to the baseline catalog cost.
  3. When an admin edits a cost, it updates a React state `costOverrides: Record<string, number>`.
  4. Recalculated values (Subtotals, Margin, Grand Total) use `costOverrides[deviceId] ?? fallbackCost`.
  5. Upon clicking **"Save"**, a Supabase `update` call persists `costOverrides` to the `devices.cost_price` column.
- **Calculations**: Done efficiently using React `useMemo` hooks to avoid rendering lag.

## 5. Integration Points
- **PDF Exports**: The existing `exportCostAnalysisToPDF` function will be updated to respect `device.cost_price` overrides, ensuring reports match the screen.
- **Backward Compatibility**: Existing quotations where `cost_price` is NULL will seamlessly continue using the current catalog baseline lookup.
