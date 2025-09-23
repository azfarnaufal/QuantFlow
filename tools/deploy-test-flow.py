#!/usr/bin/env python3

import requests
import json
import time

def deploy_flow():
    # Read the flow file
    with open('test-flow.json', 'r') as f:
        nodes = json.load(f)
    
    # Node-RED API endpoint
    nodered_url = 'http://localhost:1880'
    
    try:
        # Get current flows
        response = requests.get(f'{nodered_url}/flows')
        revision = None
        if response.status_code == 200:
            flow_data = response.json()
            revision = flow_data.get('rev')
        
        # Prepare flow data
        flow_data = {
            "flows": nodes
        }
        
        if revision:
            flow_data['rev'] = revision
            
        # Deploy the new flow
        headers = {'Content-Type': 'application/json'}
        response = requests.post(f'{nodered_url}/flows', json=flow_data, headers=headers)
        
        if response.status_code == 200:
            print("Flow deployed successfully!")
            return True
        else:
            print(f"Failed to deploy flow: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"Error deploying flow: {e}")
        return False

def get_flow_status():
    try:
        nodered_url = 'http://localhost:1880'
        response = requests.get(f'{nodered_url}/flows')
        if response.status_code == 200:
            flow_data = response.json()
            flows = flow_data.get('flows', [])
            print(f"Number of nodes: {len(flows)}")
            for node in flows:
                if node.get('type') == 'tab':
                    print(f"Flow tab: {node.get('label', 'Unnamed')}")
                elif 'name' in node:
                    print(f"Node: {node['name']} (Type: {node['type']})")
            return True
        else:
            print(f"Failed to get flows: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error getting flow status: {e}")
        return False

if __name__ == "__main__":
    print("Deploying test flow to Node-RED...")
    if deploy_flow():
        print("Waiting for flow to initialize...")
        time.sleep(5)
        print("Checking flow status...")
        get_flow_status()
        print("\nFlow deployed successfully! You can now view the results in Node-RED's debug panel.")
        print("Access Node-RED at: http://localhost:1880")
        print("Make sure to click the 'Deploy' button in the Node-RED UI to activate the flow.")
    else:
        print("Failed to deploy flow.")