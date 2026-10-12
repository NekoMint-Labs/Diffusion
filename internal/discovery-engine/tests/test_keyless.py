import unittest
from contextlib import asynccontextmanager
from unittest import mock
import httpx
from diffusion_discovery.providers import tavily
from diffusion_discovery.providers.registry import default_registry

class KeylessTests(unittest.IsolatedAsyncioTestCase):
    async def run_request(self, status=200):
        calls=[]
        def handle(request):
            calls.append(request)
            self.assertEqual(request.headers['X-Tavily-Access-Mode'], 'keyless')
            self.assertNotIn('authorization', request.headers)
            return httpx.Response(status, json={'results':[{'title':'Fixture','url':'https://example.com/result','content':'Public result'}]})
        @asynccontextmanager
        async def client(*args, **kwargs):
            async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as transport:
                yield transport
        with mock.patch.object(tavily, 'request_client', client):
            result = await tavily.TavilySearchProvider('https://api.tavily.com', 'must-not-be-sent', keyless=True).search('public query', 1)
        return result, calls

    async def test_keyless_search_sends_no_authorization_and_returns_results(self):
        result,calls=await self.run_request()
        self.assertTrue(result.ok)
        self.assertEqual(len(calls),1)
        self.assertNotIn('must-not-be-sent', str(result))

    async def test_keyless_rate_limit_does_not_retry_the_shared_cap(self):
        result,calls=await self.run_request(429)
        self.assertFalse(result.ok)
        self.assertEqual(result.error_type,'rate_limited')
        self.assertEqual(len(calls),1)

    def test_registry_requires_explicit_access_and_source_selection(self):
        import os
        for enabled,keyless,expected in [('true','true',True),('true','false',False),('false','true',False)]:
            with mock.patch.dict(os.environ, {'TAVILY_ENABLED':enabled,'TAVILY_KEYLESS':keyless,'TAVILY_API_KEY':'','EXA_ENABLED':'false','BRAVE_ENABLED':'false'},clear=True):
                self.assertEqual('tavily' in default_registry().search_ids, expected)
