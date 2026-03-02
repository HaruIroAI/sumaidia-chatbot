# SUMAIDIA 2025夏 営業デモメモ


## JSON schema & sample

- keys
  - period: string (e.g., 2025夏)
  - department: string (営業)
  - members: array of { code: KJ|KN|TGL|YGLH, role: member|manager, scores: blocks }
  - scores.general: object
  - scores.manager: object (manager only)
  - scores.monthlyDept: { months: {3..8:number}, rule: string } (manager only)

```json
{
  "period": "2025夏",
  "department": "営業",
  "members": [
    { "code": "KJ", "role": "member", "scores": { "general": {} } },
    { "code": "KN", "role": "member", "scores": { "general": {} } },
    { "code": "TGL", "role": "manager", "scores": { "general": {}, "manager": {}, "monthlyDept": { "months": { "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0 }, "rule": "dept-monthly-conversion-v1" } } },
    { "code": "YGLH", "role": "manager", "scores": { "general": {}, "manager": {}, "monthlyDept": { "months": { "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0 }, "rule": "dept-monthly-conversion-v1" } } }
  ]
}
```

## Integration Notes for Excel Export

- demo input contract
  - JSON path: data/demo/sumaidia_sales_2025Natsu.json
  - period: 2025夏, department: 営業
  - roles: TGL/YGLH=manager, KJ/KN=member
- manager scoring combines
  - general + manager + monthlyDept
  - monthly department points: months 3..8, rule=dept-monthly-conversion-v1
