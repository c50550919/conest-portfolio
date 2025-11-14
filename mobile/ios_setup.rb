require 'fileutils'
require 'xcodeproj'

project_name = 'conest'
ios_dir = 'ios'

# Create iOS directory structure
FileUtils.mkdir_p("#{ios_dir}/#{project_name}")
FileUtils.mkdir_p("#{ios_dir}/#{project_name}Tests")

puts "✓ iOS project structure created"
