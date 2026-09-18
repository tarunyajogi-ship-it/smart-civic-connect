import os
import json
import unittest
from app import app, db

class SmartCivicConnectAPITestCase(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_health_check(self):
        """Test the health check endpoint returns status and initialization status."""
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'ok')
        self.assertIn('firebase_initialized', data)

    def test_uninitialized_firebase_behavior(self):
        """Test endpoints fail gracefully with 503 if Firebase is uninitialized."""
        if db is None:
            # Endpoint requests should return 503 service unavailable
            endpoints = [
                ('/api/complaints', 'POST'),
                ('/api/complaints/support', 'POST'),
                ('/api/users/register-officer', 'POST'),
                ('/api/escalate/trigger', 'POST'),
                ('/api/analytics', 'GET')
            ]
            
            for url, method in endpoints:
                if method == 'POST':
                    response = self.client.post(url, json={})
                else:
                    response = self.client.get(url)
                
                self.assertEqual(response.status_code, 503)
                data = json.loads(response.data)
                self.assertEqual(data['status'], 'error')
                self.assertIn('Firebase serviceAccountKey.json not found', data['message'])
        else:
            print("Firebase is initialized; skipping uninitialized behavior test.")

    def test_category_department_routing_logic(self):
        """Test routing logic mapping categories to departments."""
        from config import Config
        routing_map = Config.CATEGORY_DEPARTMENT_MAP
        
        self.assertEqual(routing_map.get("Garbage"), "Sanitation")
        self.assertEqual(routing_map.get("Potholes"), "Public Works")
        self.assertEqual(routing_map.get("WaterLeakage"), "Water Supply")
        self.assertEqual(routing_map.get("Drainage"), "Sanitation")
        self.assertEqual(routing_map.get("Streetlights"), "Electricity")
        self.assertEqual(routing_map.get("RoadDamage"), "Public Works")

if __name__ == '__main__':
    unittest.main()
