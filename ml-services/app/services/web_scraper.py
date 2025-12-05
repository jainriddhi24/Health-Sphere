try:
    import requests
    HAS_REQUESTS = True
except Exception:
    requests = None
    HAS_REQUESTS = False
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
import time
import logging
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse
import re

logger = logging.getLogger(__name__)

class WebsiteScraper:
    def __init__(self):
        if not HAS_REQUESTS:
            logger.warning('requests package not installed in this environment. Website scraping will not function until `requests` is installed.')
            self.session = None
            return
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def scrape_website(self, url: str, max_pages: int = 10) -> Dict[str, str]:
        """
        Scrape website content including main page and linked pages.

        Args:
            url: Base URL to scrape
            max_pages: Maximum number of pages to scrape

        Returns:
            Dictionary with page URLs as keys and content as values
        """
        try:
            if not self.session:
                return {'error': 'requests not installed; enable web scraping by installing requests: pip install requests'}
            # First, get the main page
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'lxml')
            content = self._extract_content(soup, url)

            scraped_pages = {url: content}

            # Find and scrape linked pages
            links = self._find_internal_links(soup, url)
            for link in links[:max_pages-1]:  # -1 because we already scraped main page
                try:
                    page_response = self.session.get(link, timeout=10)
                    page_response.raise_for_status()

                    page_soup = BeautifulSoup(page_response.content, 'lxml')
                    page_content = self._extract_content(page_soup, link)
                    scraped_pages[link] = page_content

                    time.sleep(1)  # Be respectful to the server
                except Exception as e:
                    logger.warning(f"Failed to scrape {link}: {e}")
                    continue

            return scraped_pages

        except Exception as e:
            logger.error(f"Failed to scrape website {url}: {e}")
            return {}

    def scrape_with_selenium(self, url: str) -> str:
        """
        Scrape website using Selenium for JavaScript-heavy sites.

        Args:
            url: URL to scrape

        Returns:
            Extracted text content
        """
        driver = None
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")

            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)

            driver.get(url)
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )

            # Wait a bit for dynamic content to load
            time.sleep(3)

            soup = BeautifulSoup(driver.page_source, 'lxml')
            content = self._extract_content(soup, url)

            return content

        except Exception as e:
            logger.error(f"Failed to scrape with Selenium {url}: {e}")
            return ""
        finally:
            if driver:
                driver.quit()

    def _extract_content(self, soup: BeautifulSoup, url: str) -> str:
        """
        Extract meaningful content from BeautifulSoup object.

        Args:
            soup: BeautifulSoup object
            url: Source URL

        Returns:
            Extracted text content
        """
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Extract title
        title = soup.title.string if soup.title else ""
        title = title.strip() if title else ""

        # Extract meta description
        meta_desc = ""
        meta_tag = soup.find('meta', attrs={'name': 'description'})
        if meta_tag and meta_tag.get('content'):
            meta_desc = meta_tag['content'].strip()

        # Extract headings
        headings = []
        for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            heading_text = h.get_text().strip()
            if heading_text:
                headings.append(heading_text)

        # Extract main content
        # Try to find main content areas
        content_selectors = [
            'main',
            '[role="main"]',
            '.content',
            '#content',
            '.main-content',
            'article',
            '.post-content',
            '.entry-content'
        ]

        main_content = ""
        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                main_content = content_elem.get_text(separator=' ', strip=True)
                break

        # If no main content found, get all paragraph text
        if not main_content:
            paragraphs = soup.find_all('p')
            main_content = ' '.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])

        # Combine all content
        full_content = f"Title: {title}\n\n"
        if meta_desc:
            full_content += f"Description: {meta_desc}\n\n"
        if headings:
            full_content += f"Headings: {' | '.join(headings)}\n\n"
        full_content += f"Content: {main_content}\n\n"
        full_content += f"Source: {url}"

        # Clean up extra whitespace
        full_content = re.sub(r'\s+', ' ', full_content).strip()

        return full_content

    def _find_internal_links(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """
        Find internal links on the page.

        Args:
            soup: BeautifulSoup object
            base_url: Base URL for resolving relative links

        Returns:
            List of internal URLs
        """
        base_domain = urlparse(base_url).netloc
        links = set()

        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            full_url = urljoin(base_url, href)
            parsed_url = urlparse(full_url)

            # Only include links from the same domain
            if parsed_url.netloc == base_domain and parsed_url.scheme in ['http', 'https']:
                # Avoid fragments and query parameters for uniqueness
                clean_url = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"
                if clean_url != base_url and clean_url not in links:
                    links.add(clean_url)

        return list(links)

def extract_key_features(content: str, max_length: int = 500) -> str:
    """
    Extract and summarize key features from scraped content.
    
    Identifies important sections like features, benefits, pricing, etc.
    
    Args:
        content: Raw scraped content
        max_length: Maximum length of extracted summary
    
    Returns:
        Summarized key features
    """
    if not content:
        return ""
    
    # Define keywords for different feature categories
    feature_patterns = {
        'benefits': r'benefit|advantage|improve|enhance|help',
        'features': r'feature|capability|function|tool|service',
        'pricing': r'price|cost|plan|subscription|free',
        'health_topic': r'health|wellness|fitness|nutrition|medical|disease|treatment',
        'recommendations': r'recommend|suggest|advise|should|best practice'
    }
    
    sentences = re.split(r'[.!?]+', content)
    key_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 15:  # Skip very short fragments
            continue
        
        # Check if sentence matches any feature pattern
        for category, pattern in feature_patterns.items():
            if re.search(pattern, sentence, re.IGNORECASE):
                key_sentences.append(sentence)
                break
    
    # Limit to max_length
    summary = '. '.join(key_sentences[:5])  # Take up to 5 key sentences
    if len(summary) > max_length:
        summary = summary[:max_length].rsplit(' ', 1)[0] + '...'
    
    return summary


def extract_structured_features(scraped_data: Dict[str, str]) -> Dict[str, Any]:
    """
    Extract structured information from scraped website content.
    
    Returns a dictionary with categorized information.
    
    Args:
        scraped_data: Dictionary of URL to content from scraper
    
    Returns:
        Structured dictionary with extracted features
    """
    structured = {
        'title': '',
        'key_features': '',
        'content_summary': '',
        'urls_processed': list(scraped_data.keys()),
        'relevance_score': 0.8  # Default relevance
    }
    
    if not scraped_data:
        return structured
    
    # Process first (main) page
    main_url = list(scraped_data.keys())[0]
    main_content = scraped_data[main_url]
    
    # Extract title from content
    title_match = re.search(r'Title:\s*([^\n]+)', main_content)
    if title_match:
        structured['title'] = title_match.group(1).strip()
    
    # Extract key features
    structured['key_features'] = extract_key_features(main_content)
    
    # Create content summary (limit to first 300 chars of main content)
    if len(main_content) > 300:
        structured['content_summary'] = main_content[:300] + '...'
    else:
        structured['content_summary'] = main_content
    
    return structured


def scrape_website_features(url: str, use_selenium: bool = False, extract_features: bool = True) -> Dict[str, Any]:
    """
    Main function to scrape website features.

    Args:
        url: Website URL to scrape
        use_selenium: Whether to use Selenium for JavaScript rendering
        extract_features: Whether to extract and structure key features (default True)

    Returns:
        Dictionary with scraped content and optionally extracted features
    """
    scraper = WebsiteScraper()

    if use_selenium:
        content = scraper.scrape_with_selenium(url)
        scraped_data = {url: content} if content else {}
    else:
        scraped_data = scraper.scrape_website(url)
    
    if not scraped_data:
        return {'error': 'Failed to scrape website', 'raw_data': {}}
    
    # Return raw scraped data
    result = {'raw_data': scraped_data}
    
    # Extract structured features if requested
    if extract_features:
        result['structured_features'] = extract_structured_features(scraped_data)
    
    return result
