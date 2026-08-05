import type { BookkeepingAccount, BookkeepingCategory, BookkeepingRecord, BookkeepingRecordInput } from "../types";
import { RecordForm } from "./RecordForm";

export function QuickRecord({ record, categories, accounts, onSave, onCancel }: { record?: BookkeepingRecord; categories: BookkeepingCategory[]; accounts: BookkeepingAccount[]; onSave: (input: BookkeepingRecordInput) => void; onCancel?: () => void }) { return <RecordForm record={record} categories={categories} accounts={accounts} onSave={onSave} onCancel={onCancel} />; }
