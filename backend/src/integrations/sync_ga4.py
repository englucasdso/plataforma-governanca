import os
import json
import traceback
from google.oauth2 import service_account
from google.analytics.admin import AnalyticsAdminServiceClient
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'secrets', 'ga4-service-account.json')
DATA_PATH = os.path.join(BASE_DIR, 'data', 'ga4-events.json')
SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']

def main():
    try:
        print("[GA4-SYNC-PY] Starting python sync process...")
        if not os.path.exists(CREDENTIALS_PATH):
            raise FileNotFoundError(f"Service account file not found: {CREDENTIALS_PATH}")

        credentials = service_account.Credentials.from_service_account_file(
            CREDENTIALS_PATH, scopes=SCOPES
        )

        admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        data_client = BetaAnalyticsDataClient(credentials=credentials)

        accounts_list = admin_client.list_accounts()
        
        output_data = {"accounts": []}

        for account in accounts_list:
            acc_data = {
                "accountId": account.name.split("/")[-1],
                "accountName": account.display_name,
                "properties": []
            }
            
            # List properties
            properties_list = admin_client.list_properties(filter=f"parent:{account.name}")
            for prop in properties_list:
                prop_id = prop.name.split("/")[-1]
                prop_data = {
                    "propertyId": prop_id,
                    "propertyName": prop.display_name,
                    "events": []
                }
                
                try:
                    # Run generic report on eventName dimension just to get events that occurred
                    request = RunReportRequest(
                        property=f"properties/{prop_id}",
                        dimensions=[Dimension(name="eventName")],
                        metrics=[Metric(name="eventCount")],
                        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
                    )
                    response = data_client.run_report(request)
                    
                    for row in response.rows:
                        event_name = row.dimension_values[0].value
                        event_count = row.metric_values[0].value
                        prop_data["events"].append({
                            "id": f"{prop_id}_{event_name}",
                            "name": event_name,
                            "platform": "GA4",
                            "status": "ativo" if int(event_count) > 0 else "inativo",
                            "lastOccurrence": f"Count: {event_count}" 
                        })
                except Exception as e:
                    print(f"[GA4-SYNC-PY] Error fetching events for property {prop_id}: {e}")
                    
                acc_data["properties"].append(prop_data)
                
            output_data["accounts"].append(acc_data)
            
        os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
        with open(DATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
            
        print("[GA4-SYNC-PY] Sync completed successfully")
    except Exception as exc:
        print("[GA4-SYNC-PY] Fatal Error during sync")
        traceback.print_exc()
        raise SystemExit(1)

if __name__ == "__main__":
    main()
