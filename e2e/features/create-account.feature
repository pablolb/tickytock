Feature: Create Account
  As a new user
  I want to create a new account
  So I can start tracking my time

  Scenario: Create a new account with valid credentials
    Given I am on the unlock page
    When I click the "Create Account" button
    And I enter username "Alice"
    And I enter passphrase "secure-pass-123"
    And I confirm passphrase "secure-pass-123"
    And I submit the create account form
    Then I should see the main app
    And the account "Alice" should exist

  Scenario: Create account with mismatched passphrases
    Given I am on the unlock page
    When I click the "Create Account" button
    And I enter username "Bob"
    And I enter passphrase "password123"
    And I confirm passphrase "different-password"
    Then I should see an error message about passphrase mismatch

  Scenario: Create account with empty username
    Given I am on the unlock page
    When I click the "Create Account" button
    And I enter username ""
    And I enter passphrase "password123"
    And I confirm passphrase "password123"
    Then the submit button should be disabled

  Scenario: Create account with short passphrase
    Given I am on the unlock page
    When I click the "Create Account" button
    And I enter username "Charlie"
    And I enter passphrase "123"
    And I confirm passphrase "123"
    Then the submit button should be enabled
