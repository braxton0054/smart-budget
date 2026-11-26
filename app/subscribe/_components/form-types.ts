export type SelectedPlan = {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
};

export type SubscribeState = {
  status: "idle" | "success" | "error";
  message: string;
  selectedPlan?: SelectedPlan;
  paymentId?: string;
  errors?: Record<string, string>;
};

export const initialSubscribeState: SubscribeState = { status: "idle", message: "" };
