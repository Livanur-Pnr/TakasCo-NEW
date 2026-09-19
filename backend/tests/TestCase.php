<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Bu backend API-only; Breeze blade görünümleri Vite derlemesi gerektirir ve testte build yoktur
        $this->withoutVite();
    }
}
