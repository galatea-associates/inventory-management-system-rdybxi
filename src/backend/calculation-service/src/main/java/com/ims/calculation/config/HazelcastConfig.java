package com.ims.calculation.config;

import org.springframework.context.annotation.Bean;  // Spring 6.0.9
import org.springframework.context.annotation.Configuration;  // Spring 6.0.9
import org.springframework.beans.factory.annotation.Value;  // Spring 6.0.9
import com.hazelcast.config.Config;  // Hazelcast 5.3.0
import com.hazelcast.config.MapConfig;  // Hazelcast 5.3.0
import com.hazelcast.config.EvictionConfig;  // Hazelcast 5.3.0
import com.hazelcast.config.MaxSizePolicy;  // Hazelcast 5.3.0
import com.hazelcast.config.EvictionPolicy;  // Hazelcast 5.3.0
import com.hazelcast.config.JoinConfig;  // Hazelcast 5.3.0
import com.hazelcast.config.NetworkConfig;  // Hazelcast 5.3.0
import com.hazelcast.config.TcpIpConfig;  // Hazelcast 5.3.0
import com.hazelcast.config.MulticastConfig;  // Hazelcast 5.3.0
import com.hazelcast.core.Hazelcast;  // Hazelcast 5.3.0
import com.hazelcast.core.HazelcastInstance;  // Hazelcast 5.3.0
import lombok.extern.slf4j.Slf4j;  // Lombok 1.18.26
import java.util.Arrays;  // Java 17

/**
 * Configuration class for Hazelcast distributed in-memory data grid in the Calculation Service.
 * Configures Hazelcast for high-performance caching of position, inventory, and limit data
 * to support real-time calculation requirements of the Inventory Management System.
 * 
 * This configuration supports the system's needs to process 300,000+ events per second
 * with end-to-end latency under 200ms and achieve 99.999% uptime during operational hours.
 */
@Configuration
@Slf4j
public class HazelcastConfig {

    @Value("${spring.hazelcast.cluster-name}")
    private String clusterName;

    @Value("${spring.hazelcast.instance-name}")
    private String instanceName;

    @Value("${spring.hazelcast.multicast-enabled}")
    private Boolean multicastEnabled;

    @Value("${spring.hazelcast.tcp-ip-members}")
    private String tcpIpMembers;

    @Value("${spring.hazelcast.port}")
    private Integer port;

    @Value("${spring.hazelcast.backup-count}")
    private Integer backupCount;

    @Value("${spring.hazelcast.position-map-ttl-seconds}")
    private Integer positionMapTtlSeconds;

    @Value("${spring.hazelcast.inventory-map-ttl-seconds}")
    private Integer inventoryMapTtlSeconds;

    @Value("${spring.hazelcast.rule-map-ttl-seconds}")
    private Integer ruleMapTtlSeconds;

    @Value("${spring.hazelcast.max-size-per-node}")
    private Integer maxSizePerNode;

    /**
     * Creates and configures the Hazelcast configuration.
     *
     * @return Configured Hazelcast Config object
     */
    @Bean
    public Config hazelcastConfig() {
        Config config = new Config();
        config.setClusterName(clusterName);
        config.setInstanceName(instanceName);
        
        // Configure network settings
        configureNetwork(config);
        
        // Add map configurations for different data types
        config.addMapConfig(positionMapConfig());
        config.addMapConfig(inventoryMapConfig());
        config.addMapConfig(clientLimitMapConfig());
        config.addMapConfig(aggregationUnitLimitMapConfig());
        config.addMapConfig(ruleMapConfig());
        
        log.info("Hazelcast configuration created with cluster name: {}, instance name: {}", 
                clusterName, instanceName);
        log.info("Maps configured with: position TTL={}, inventory TTL={}, rule TTL={}, max size per node={}",
                positionMapTtlSeconds, inventoryMapTtlSeconds, ruleMapTtlSeconds, maxSizePerNode);
        
        return config;
    }

    /**
     * Creates and returns a Hazelcast instance.
     *
     * @return Configured Hazelcast instance
     */
    @Bean
    public HazelcastInstance hazelcastInstance() {
        HazelcastInstance instance = Hazelcast.newHazelcastInstance(hazelcastConfig());
        log.info("Hazelcast instance created successfully: {}", instance.getName());
        return instance;
    }

    /**
     * Configures network settings for Hazelcast.
     *
     * @param config Hazelcast configuration
     * @return Configured network settings
     */
    private NetworkConfig configureNetwork(Config config) {
        NetworkConfig networkConfig = config.getNetworkConfig();
        networkConfig.setPort(port);
        networkConfig.setPortAutoIncrement(true);
        
        JoinConfig joinConfig = networkConfig.getJoinConfig();
        
        // Configure discovery mechanism based on properties
        if (multicastEnabled) {
            // Use multicast for node discovery
            log.info("Configuring Hazelcast with multicast discovery");
            MulticastConfig multicastConfig = joinConfig.getMulticastConfig();
            multicastConfig.setEnabled(true);
            joinConfig.getTcpIpConfig().setEnabled(false);
        } else {
            // Use TCP/IP for node discovery
            log.info("Configuring Hazelcast with TCP/IP discovery. Members: {}", tcpIpMembers);
            joinConfig.getMulticastConfig().setEnabled(false);
            
            TcpIpConfig tcpIpConfig = joinConfig.getTcpIpConfig();
            tcpIpConfig.setEnabled(true);
            
            // Add members from configuration
            String[] members = tcpIpMembers.split(",");
            Arrays.stream(members)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .forEach(tcpIpConfig::addMember);
            
            log.info("TCP/IP members configured: {}", Arrays.toString(members));
        }
        
        return networkConfig;
    }

    /**
     * Creates map configuration for position cache.
     * This cache stores position data for real-time calculations.
     *
     * @return Position map configuration
     */
    private MapConfig positionMapConfig() {
        MapConfig mapConfig = new MapConfig("positionCache");
        mapConfig.setBackupCount(backupCount);
        mapConfig.setTimeToLiveSeconds(positionMapTtlSeconds);
        mapConfig.setEvictionConfig(createEvictionConfig());
        return mapConfig;
    }

    /**
     * Creates map configuration for inventory cache.
     * This cache stores inventory availability data used for loan, pledge,
     * and other inventory calculations.
     *
     * @return Inventory map configuration
     */
    private MapConfig inventoryMapConfig() {
        MapConfig mapConfig = new MapConfig("inventoryCache");
        mapConfig.setBackupCount(backupCount);
        mapConfig.setTimeToLiveSeconds(inventoryMapTtlSeconds);
        mapConfig.setEvictionConfig(createEvictionConfig());
        return mapConfig;
    }

    /**
     * Creates map configuration for client limit cache.
     * This cache stores client-level trading limits for long and short selling.
     *
     * @return Client limit map configuration
     */
    private MapConfig clientLimitMapConfig() {
        MapConfig mapConfig = new MapConfig("clientLimitCache");
        mapConfig.setBackupCount(backupCount);
        mapConfig.setTimeToLiveSeconds(inventoryMapTtlSeconds);
        mapConfig.setEvictionConfig(createEvictionConfig());
        return mapConfig;
    }

    /**
     * Creates map configuration for aggregation unit limit cache.
     * This cache stores aggregation unit level trading limits used for
     * regulatory compliance across different markets.
     *
     * @return Aggregation unit limit map configuration
     */
    private MapConfig aggregationUnitLimitMapConfig() {
        MapConfig mapConfig = new MapConfig("aggregationUnitLimitCache");
        mapConfig.setBackupCount(backupCount);
        mapConfig.setTimeToLiveSeconds(inventoryMapTtlSeconds);
        mapConfig.setEvictionConfig(createEvictionConfig());
        return mapConfig;
    }

    /**
     * Creates map configuration for calculation rule cache.
     * This cache stores market-specific calculation rules used to determine
     * inventory availability based on regulatory requirements.
     *
     * @return Rule map configuration
     */
    private MapConfig ruleMapConfig() {
        MapConfig mapConfig = new MapConfig("ruleCache");
        mapConfig.setBackupCount(backupCount);
        mapConfig.setTimeToLiveSeconds(ruleMapTtlSeconds);
        mapConfig.setEvictionConfig(createEvictionConfig());
        return mapConfig;
    }

    /**
     * Creates eviction configuration for maps.
     * Uses LRU (Least Recently Used) policy to manage memory usage.
     *
     * @return Eviction configuration
     */
    private EvictionConfig createEvictionConfig() {
        EvictionConfig evictionConfig = new EvictionConfig();
        evictionConfig.setEvictionPolicy(EvictionPolicy.LRU);
        evictionConfig.setMaxSizePolicy(MaxSizePolicy.PER_NODE);
        evictionConfig.setSize(maxSizePerNode);
        return evictionConfig;
    }
}